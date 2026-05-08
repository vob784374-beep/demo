"""
Business/domain event logger.
Use for meaningful state transitions: enrollment, course publish, grading.
NOT for HTTP-level events (use access logger) or errors (use structlog directly).
"""
import structlog

business_logger = structlog.get_logger('lms.business')


def log_business_event(event: str, **context) -> None:
    business_logger.info(event, log_category='business', **context)
