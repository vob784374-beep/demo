"""
Logging configuration for lms-api.

Why stdlib.LoggerFactory instead of PrintLoggerFactory
───────────────────────────────────────────────────────
  PrintLoggerFactory writes directly to stdout and bypasses Python's logging
  handler chain entirely — file handlers never receive those records.

  stdlib.LoggerFactory wraps real stdlib loggers, so every structlog event
  travels through the root logger's handler list (console + file handlers).
  ProcessorFormatter is applied to those handlers so structlog's own rendering
  (ConsoleRenderer / JSONRenderer) still runs on every record.

Processor chain (applied to every log entry before rendering):
  1. merge_contextvars      — inject request_id, trace_id, user_id from contextvars
  2. add_service_context    — stamp service + environment
  3. add_log_level          — add 'level' key
  4. _vn_timestamper        — ISO-8601 timestamp in Asia/Ho_Chi_Minh (UTC+7)
  5. StackInfoRenderer      — include stack_info when present
  6. mask_sensitive_fields  — redact passwords / tokens / PII
  7. wrap_for_formatter     — hand the event dict to ProcessorFormatter

Final rendering (in ProcessorFormatter, per environment):
  development / testing  → ConsoleRenderer (human-readable, coloured in dev)
  staging / production   → ExceptionRenderer → JSONRenderer (machine-readable)

File logging (LOG_DIR is set by default in all non-test environments)
────────────────────────────────────────────────────────────────────────
  Three daily-rotating files, 14-day retention, written via a background
  QueueHandler so file I/O never blocks the request thread:

    {LOG_DIR}/app.log     — all INFO+ events except access logs
                            Rotated to: app-YYYY-MM-DD.log
    {LOG_DIR}/error.log   — ERROR+ events from every category
                            Rotated to: error-YYYY-MM-DD.log
    {LOG_DIR}/access.log  — HTTP access events only (log_category=access)
                            Rotated to: access-YYYY-MM-DD.log

  In containerised deployments (ECS/Fargate, Kubernetes) set LOG_DIR=''
  or leave it unset to write stdout only and ship logs via the platform
  collector (CloudWatch / Loki / Datadog).
"""
from __future__ import annotations

import logging
import logging.handlers
import os
import queue
import re
import sys
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import structlog

from app.logging.processors import mask_sensitive_fields, add_service_context

SERVICE_NAME = 'lms-api'
LOG_RETENTION_DAYS = 14

_VN_TZ = ZoneInfo('Asia/Ho_Chi_Minh')


def _vn_timestamper(logger: Any, method: str, event_dict: dict) -> dict:
    """Stamp every log entry with ISO-8601 timestamp in Asia/Ho_Chi_Minh (UTC+7)."""
    event_dict['timestamp'] = datetime.now(_VN_TZ).isoformat()
    return event_dict


class _AccessOnlyFilter(logging.Filter):
    """Passes only records from the lms.access logger."""
    def filter(self, record: logging.LogRecord) -> bool:
        return record.name == 'lms.access'


class _NoAccessFilter(logging.Filter):
    """Passes all records EXCEPT those from lms.access."""
    def filter(self, record: logging.LogRecord) -> bool:
        return record.name != 'lms.access'


def configure_logging(app) -> None:
    debug = app.config.get('DEBUG', False)
    testing = app.config.get('TESTING', False)
    environment = app.config.get('APP_ENV', 'development')
    log_level_name = app.config.get('LOG_LEVEL', 'DEBUG' if debug else 'INFO')
    log_level = getattr(logging, log_level_name.upper(), logging.INFO)
    log_dir = app.config.get('LOG_DIR') or None  # treat '' same as None

    use_console = debug or testing

    pre_chain: list[Any] = [
        structlog.contextvars.merge_contextvars,
        add_service_context(SERVICE_NAME, environment),
        structlog.stdlib.add_log_level,
        _vn_timestamper,
        structlog.processors.StackInfoRenderer(),
        mask_sensitive_fields,
    ]

    # ProcessorFormatter.format() extracts the event dict internally before
    # passing it through `processors`; no extract_from_record step needed.
    if use_console:
        final_chain: list[Any] = [
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.dev.ConsoleRenderer(colors=not testing),
        ]
    else:
        final_chain = [
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.ExceptionRenderer(),
            structlog.processors.JSONRenderer(),
        ]

    structlog.configure(
        processors=pre_chain + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.BoundLogger,
        cache_logger_on_first_use=False,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=final_chain,
        foreign_pre_chain=pre_chain,  # applied to plain stdlib records
    )

    _configure_stdlib(log_level, log_dir, formatter)


def _configure_stdlib(
    level: int,
    log_dir: str | None,
    formatter: structlog.stdlib.ProcessorFormatter,
) -> None:
    """Wire stdlib root logger with console + optional file handlers.

    All handlers share the same ProcessorFormatter so structlog's rendering
    (ConsoleRenderer or JSONRenderer) applies uniformly to every output.
    """
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers = []
    root.setLevel(level)
    root.addHandler(console)

    if log_dir:
        os.makedirs(log_dir, exist_ok=True)

        app_h = _make_handler(os.path.join(log_dir, 'app.log'), level, formatter)
        app_h.addFilter(_NoAccessFilter())

        err_h = _make_handler(os.path.join(log_dir, 'error.log'), logging.ERROR, formatter)

        access_h = _make_handler(os.path.join(log_dir, 'access.log'), level, formatter)
        access_h.addFilter(_AccessOnlyFilter())

        for h in (app_h, err_h, access_h):
            root.addHandler(_async_wrap(h))

    logging.getLogger('werkzeug').setLevel(logging.WARNING)


# ── Daily-rotating handler ────────────────────────────────────────────────────

class _DatedRotatingFileHandler(logging.handlers.TimedRotatingFileHandler):
    """Daily-rotating handler that names archived files stem-YYYY-MM-DD.ext.

    Default TimedRotatingFileHandler produces  app.log.2026-04-20
    This subclass produces                     app-2026-04-20.log

    getFilesToDelete is also overridden so auto-cleanup matches the custom
    naming pattern (the default implementation would never find them).
    """

    _DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')

    def namer(self, default_name: str) -> str:  # type: ignore[override]
        directory = os.path.dirname(default_name)
        basename = os.path.basename(default_name)  # e.g. app.log.2026-04-20
        stem, _, rest = basename.partition('.')     # stem='app', rest='log.2026-04-20'
        parts = rest.rsplit('.', 1)                 # ['log', '2026-04-20']
        if len(parts) == 2 and self._DATE_RE.match(parts[1]):
            ext, date_suffix = parts
            return os.path.join(directory, f'{stem}-{date_suffix}.{ext}')
        return default_name

    def getFilesToDelete(self) -> list[str]:
        dir_name, base_name = os.path.split(self.baseFilename)
        stem, _, ext_part = base_name.partition('.')  # 'app', '.', 'log'
        pattern = re.compile(
            rf'^{re.escape(stem)}-(\d{{4}}-\d{{2}}-\d{{2}})\.{re.escape(ext_part)}$'
        )
        matches = sorted(
            os.path.join(dir_name, f)
            for f in os.listdir(dir_name)
            if pattern.match(f)
        )
        excess = len(matches) - self.backupCount
        return matches[:excess] if excess > 0 else []


def _make_handler(
    path: str,
    level: int,
    formatter: structlog.stdlib.ProcessorFormatter,
) -> _DatedRotatingFileHandler:
    h = _DatedRotatingFileHandler(
        filename=path,
        when='midnight',
        backupCount=LOG_RETENTION_DAYS,
        encoding='utf-8',
        utc=True,
    )
    h.setLevel(level)
    h.setFormatter(formatter)
    return h


class _PassthroughQueueHandler(logging.handlers.QueueHandler):
    """QueueHandler that skips prepare()-time serialization.

    Python 3.12+ QueueHandler.prepare() converts record.msg to a string via
    self.format() before enqueuing. That destroys the dict that
    ProcessorFormatter needs when the QueueListener feeds the record to the
    actual file handler. This subclass passes the record through untouched so
    ProcessorFormatter can render it on the listener thread.
    """
    def prepare(self, record: logging.LogRecord) -> logging.LogRecord:
        return record


def _async_wrap(handler: logging.Handler) -> _PassthroughQueueHandler:
    """Wrap a handler in a passthrough QueueHandler + QueueListener for non-blocking file I/O."""
    q: queue.Queue = queue.Queue(maxsize=10_000)
    listener = logging.handlers.QueueListener(q, handler, respect_handler_level=True)
    listener.start()
    return _PassthroughQueueHandler(q)
