import structlog.contextvars
from flask import Response, jsonify, make_response
from app.constants.errors import ErrorCode, ErrorTitle
from app.constants.messages import ServerMessage


def _request_id() -> str | None:
    return structlog.contextvars.get_contextvars().get('request_id')


def flatten_validation_messages(messages: dict) -> str:
    """Convert marshmallow nested validation errors into a single readable string."""
    return '; '.join(f"{field}: {', '.join(errs)}" for field, errs in messages.items())


# ---------------------------------------------------------------------------
# Core builders
# ---------------------------------------------------------------------------

def success_response(data, status: int = 200):
    return jsonify({
        'success': True,
        'code': 'OK',
        'message': 'Success',
        'data': data,
        'meta': None,
        'request_id': _request_id(),
    }), status


def paginated_response(items: list, page: int, per_page: int, total: int):
    return jsonify({
        'success': True,
        'code': 'OK',
        'message': 'Success',
        'data': items,
        'meta': {'page': page, 'per_page': per_page, 'total': total},
        'request_id': _request_id(),
    }), 200


def error_response(code: str, title: str, detail: str, status: int):
    return jsonify({
        'success': False,
        'code': code,
        'message': detail,
        'data': None,
        'meta': None,
        'request_id': _request_id(),
    }), status


# ---------------------------------------------------------------------------
# Typed shortcuts
# ---------------------------------------------------------------------------

def validation_error_response(detail: str):
    return error_response(ErrorCode.VALIDATION_ERROR, ErrorTitle.VALIDATION_ERROR, detail, 422)


def unauthorized_response(detail: str):
    return error_response(ErrorCode.UNAUTHORIZED, ErrorTitle.UNAUTHORIZED, detail, 401)


def forbidden_response(detail: str):
    return error_response(ErrorCode.FORBIDDEN, ErrorTitle.FORBIDDEN, detail, 403)


def internal_error_response(detail: str = ServerMessage.UNEXPECTED_ERROR):
    return error_response(ErrorCode.INTERNAL_ERROR, ErrorTitle.INTERNAL_ERROR, detail, 500)


# ---------------------------------------------------------------------------
# Cookie-response helpers (routes that must set HttpOnly cookies)
# ---------------------------------------------------------------------------

def make_cookie_response(status: int = 200) -> Response:
    """Return a mutable Response object so jwt_service can attach cookies before body is set."""
    return make_response(jsonify({
        'success': True,
        'code': 'OK',
        'message': 'Success',
        'data': None,
        'meta': None,
        'request_id': _request_id(),
    }), status)


def set_success_body(response: Response, data) -> None:
    """Overwrite the response body with the standard success envelope."""
    response.data = jsonify({
        'success': True,
        'code': 'OK',
        'message': 'Success',
        'data': data,
        'meta': None,
        'request_id': _request_id(),
    }).data
