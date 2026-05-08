"""
Request context middleware.

Runs at the outermost layer of every request to:
  1. Clear the per-thread structlog contextvars from the previous request.
  2. Generate or inherit a request_id (from X-Request-ID header if provided by
     an upstream proxy/gateway — allows end-to-end tracing).
  3. Extract or generate a trace_id compatible with:
       - W3C Trace Context (traceparent header)
       - Zipkin B3 (X-B3-TraceId header)
       - OpenTelemetry (falls back to generating a 32-hex UUID)
  4. Propagate both IDs back to the caller via response headers so the frontend
     can correlate its own logs with backend logs.

User ID binding:
  user_id is bound in __init__.py via jwt.token_verification_loader, which fires
  the moment a valid JWT is decoded — before any route logic runs.
"""
from __future__ import annotations

import uuid
import structlog
from flask import request


def register_request_context(app) -> None:

    @app.before_request
    def _bind_request_context() -> None:
        structlog.contextvars.clear_contextvars()
        request_id = request.headers.get('X-Request-ID') or str(uuid.uuid4())
        trace_id = _extract_trace_id()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            trace_id=trace_id,
        )

    @app.after_request
    def _propagate_ids(response):
        ctx = structlog.contextvars.get_contextvars()
        if rid := ctx.get('request_id'):
            response.headers['X-Request-ID'] = rid
        if tid := ctx.get('trace_id'):
            response.headers['X-Trace-ID'] = tid
        return response


def _extract_trace_id() -> str:
    """
    Extract trace_id from incoming headers in priority order:
      1. W3C traceparent  (OTEL standard)
      2. Zipkin X-B3-TraceId
      3. Generate a new 32-hex UUID

    The generated UUID uses uuid4().hex (no hyphens) to match the 32-char
    W3C trace-id format, keeping it compatible with OTEL collectors.
    """
    traceparent = request.headers.get('traceparent', '')
    if traceparent:
        parts = traceparent.split('-')
        if len(parts) >= 2 and len(parts[1]) == 32:
            return parts[1]

    b3 = request.headers.get('X-B3-TraceId', '')
    if b3:
        return b3

    return uuid.uuid4().hex
