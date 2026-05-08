from functools import wraps
from flask_jwt_extended import verify_jwt_in_request


def require_auth(fn):
    """Require a valid access token (Authorization: Bearer <token>). Returns 401 if missing/invalid."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        return fn(*args, **kwargs)
    return wrapper
