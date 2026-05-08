"""
Global error handlers with structured exception logging.

Every unhandled exception is logged at ERROR with:
  - exc_info (full traceback)
  - request_id and user_id (from contextvars — automatically merged by structlog)
  - log_category='system' for routing in log aggregators
"""

import structlog
from werkzeug.exceptions import HTTPException
from app.utils.responses import error_response, internal_error_response
from app.constants.messages import ServerMessage

logger = structlog.get_logger("lms.system")


def register_error_handlers(app) -> None:
    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        from app.constants.errors import ErrorCode

        # Use VALIDATION_ERROR for 422 Unprocessable Entity (validation errors)
        if e.code == 422:
            error_type = ErrorCode.VALIDATION_ERROR
        else:
            error_type = e.name.upper().replace(" ", "_").replace("-", "_")
        return error_response(error_type, e.name, e.description, e.code)

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        logger.error(
            "unhandled_exception",
            log_category="system",
            exc_info=e,
        )
        detail = str(e) if app.debug else ServerMessage.UNEXPECTED_ERROR
        return internal_error_response(detail)
