"""
HTTP access logger middleware.
Delegates to app.logging.access so the access category is consistently stamped.
"""
import time
from flask import request, g
from app.logging.access import log_access


def register_request_logger(app) -> None:

    @app.before_request
    def _start_timer() -> None:
        g.start_time = time.perf_counter()

    @app.after_request
    def _log_request(response):
        start = getattr(g, 'start_time', None)
        duration_ms = (
            round((time.perf_counter() - start) * 1000, 2) if start is not None else 0.0
        )
        log_access(
            method=request.method,
            path=request.path,
            status=response.status_code,
            duration_ms=duration_ms,
            ip=_client_ip(),
        )
        return response


def _client_ip() -> str:
    """Respect X-Forwarded-For set by trusted proxies/load balancers."""
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.remote_addr or 'unknown'
