"""
Access logger — HTTP lifecycle events only.

Explicitly reads request_id, trace_id, and user_id from structlog's contextvars
so these fields appear in the event dict regardless of whether the full processor
chain is active (e.g., during tests using structlog.testing.capture_logs()).
"""
import structlog

_logger = structlog.get_logger('lms.access')
_CONTEXT_FIELDS = ('request_id', 'trace_id', 'user_id')


def log_access(
    *,
    method: str,
    path: str,
    status: int,
    duration_ms: float,
    ip: str,
) -> None:
    ctx = structlog.contextvars.get_contextvars()
    _logger.info(
        'http_request',
        log_category='access',
        method=method,
        path=path,
        status=status,
        duration_ms=duration_ms,
        ip=ip,
        **{k: ctx[k] for k in _CONTEXT_FIELDS if k in ctx},
    )
