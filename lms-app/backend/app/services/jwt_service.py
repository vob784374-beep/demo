from flask import Response
from flask_jwt_extended import create_access_token, create_refresh_token
from app.models.user import User
from app.utils import jwt_utils


def generate_tokens(user: User) -> tuple[str, str]:
    """Return (access_token, refresh_token). Caller sets the cookie; body carries access only."""
    identity = str(user.id)
    additional_claims = {"role": _primary_role(user)}
    access = create_access_token(identity=identity, additional_claims=additional_claims)
    refresh = create_refresh_token(identity=identity)
    return access, refresh


def attach_tokens(response: Response, user: User) -> tuple[Response, str]:
    """
    Issue tokens for user, attach refresh token as HttpOnly cookie, and return
    (modified response, access_token) so the route can put access_token in the body.
    """
    access_token, refresh_token = generate_tokens(user)
    jwt_utils.attach_refresh_cookie(response, refresh_token)
    return response, access_token


def rotate_tokens(
    response: Response, user: User, old_jti: str, refresh_ttl: int
) -> tuple[Response, str]:
    """
    Revoke the old refresh token JTI, issue a new token pair.
    Returns (modified response, new access_token).
    Used by POST /auth/refresh.
    """
    jwt_utils.add_to_blocklist(old_jti, refresh_ttl)
    return attach_tokens(response, user)


def revoke_current_token(jti: str, ttl_seconds: int) -> None:
    """Add a token's JTI to the blocklist. Used by POST /auth/logout."""
    jwt_utils.add_to_blocklist(jti, ttl_seconds)


def get_current_user_id() -> int:
    """Return the integer user ID from the verified JWT on the current request."""
    return jwt_utils.current_identity()


def get_current_role() -> str:
    """Return the role claim from the verified JWT on the current request."""
    return jwt_utils.current_role()


def _primary_role(user: User) -> str:
    role = user.roles.first()
    return role.name if role else "student"
