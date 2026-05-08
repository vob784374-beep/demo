"""
Role-based access control decorator.

When a permission check fails, the denial is logged via the security logger
so every 403 is auditable alongside its user_id, path, and required roles.
"""
from functools import wraps
from flask import request
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.utils.responses import forbidden_response
from app.constants.messages import AuthMessage
from app.logging.security import log_permission_denied


def require_role(*roles: str):
    """Require a valid JWT AND membership in one of the specified roles.

    Returns 401 if no JWT (handled by jwt.unauthorized_loader).
    Returns 403 FORBIDDEN if role not in the allowed set.
    """
    if not roles:
        raise ValueError('require_role requires at least one role argument')

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('role') not in roles:
                user_id = str(get_jwt_identity() or 'unknown')
                log_permission_denied(
                    user_id=user_id,
                    path=request.path,
                    required_roles=list(roles),
                )
                return forbidden_response(AuthMessage.INSUFFICIENT_ROLE)
            return fn(*args, **kwargs)
        return wrapper
    return decorator
