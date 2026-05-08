"""
Database logger — slow-query detection via SQLAlchemy engine events.

In development (debug_sql=True): log every query at DEBUG level.
In production: log only queries exceeding SLOW_QUERY_THRESHOLD_MS at WARNING.

The threshold is intentionally low (100ms) so we catch N+1 patterns early.
"""
import time
import structlog
from sqlalchemy import event
from sqlalchemy.engine import Engine

_logger = structlog.get_logger('lms.db')

SLOW_QUERY_THRESHOLD_MS = 100.0


def register_db_logger(db, *, debug_sql: bool = False) -> None:
    """
    Attach timing listeners to the SQLAlchemy engine.
    Call after db.init_app(app) inside an app context.
    """
    engine: Engine = db.engine

    @event.listens_for(engine, 'before_cursor_execute')
    def _before(conn, cursor, statement, parameters, context, executemany):
        conn.info['_q_start'] = time.perf_counter()

    @event.listens_for(engine, 'after_cursor_execute')
    def _after(conn, cursor, statement, parameters, context, executemany):
        start = conn.info.pop('_q_start', None)
        if start is None:
            return
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

        if debug_sql:
            _logger.debug(
                'sql_query',
                log_category='database',
                duration_ms=elapsed_ms,
                statement=statement[:500],
            )
        elif elapsed_ms >= SLOW_QUERY_THRESHOLD_MS:
            _logger.warning(
                'slow_query',
                log_category='database',
                duration_ms=elapsed_ms,
                statement=statement[:500],
            )
