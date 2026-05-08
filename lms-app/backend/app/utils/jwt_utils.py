"""
Low-level JWT utilities — stateless helpers with no DB access.
Consumed by jwt_service; routes and middleware should call the service, not this module directly.
"""
from flask import Response, current_app
from flask_jwt_extended import (
    decode_token,
    get_jwt,
    get_jwt_identity,
    set_refresh_cookies,
    unset_jwt_cookies,
    verify_jwt_in_request,
)
from jwt.exceptions import DecodeError, ExpiredSignatureError

# ---------------------------------------------------------------------------
# In-memory JTI blocklist — used in testing / when Redis is unavailable
# ---------------------------------------------------------------------------
_memory_blocklist: set[str] = set()


def _redis_client():
    """Return a redis.Redis instance if RATELIMIT_STORAGE_URI points to Redis, else None."""
    try:
        import redis
        uri = current_app.config.get('RATELIMIT_STORAGE_URI', 'memory://')
        if uri.startswith('redis'):
            return redis.from_url(uri, decode_responses=True)
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# JTI blocklist (revocation)
# ---------------------------------------------------------------------------

def add_to_blocklist(jti: str, ttl_seconds: int) -> None:
    """Mark a JTI as revoked. TTL matches the token's remaining lifetime."""
    client = _redis_client()
    if client:
        client.setex(f'jwt:block:{jti}', ttl_seconds, '1')
    else:
        _memory_blocklist.add(jti)


def is_blocklisted(jti: str) -> bool:
    """Return True if the JTI has been revoked."""
    client = _redis_client()
    if client:
        return client.exists(f'jwt:block:{jti}') > 0
    return jti in _memory_blocklist


# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

def attach_refresh_cookie(response: Response, refresh_token: str) -> Response:
    """Set the refresh token as an HttpOnly cookie on an existing response."""
    set_refresh_cookies(response, refresh_token)
    return response


def clear_auth_cookies(response: Response) -> Response:
    """Remove JWT cookies — call on logout."""
    unset_jwt_cookies(response)
    return response


# ---------------------------------------------------------------------------
# Request-context accessors (call inside a JWT-protected route)
# ---------------------------------------------------------------------------

def current_identity() -> int:
    """Return integer user ID from the verified JWT on the current request."""
    return int(get_jwt_identity())


def current_role() -> str:
    """Return role claim from the verified JWT on the current request."""
    return get_jwt().get('role', 'student')


def current_claims() -> dict:
    """Return all claims from the verified JWT on the current request."""
    return get_jwt()


def current_jti() -> str:
    """Return the JTI of the current request's JWT — used to revoke it on logout."""
    return get_jwt()['jti']


# ---------------------------------------------------------------------------
# Token verification (route guards)
# ---------------------------------------------------------------------------

def verify_access_token(optional: bool = False) -> None:
    """Assert a valid access token is present in the current request."""
    verify_jwt_in_request(optional=optional, refresh=False)


def verify_refresh_token() -> None:
    """Assert a valid refresh token cookie is present in the current request."""
    verify_jwt_in_request(refresh=True)


# ---------------------------------------------------------------------------
# Raw token inspection (no request context needed)
# ---------------------------------------------------------------------------

def extract_identity(token: str) -> str:
    """Return the subject (user ID string) from a raw JWT string."""
    return decode_token(token)['sub']


def extract_role_claim(token: str) -> str:
    """Return the role claim from a raw JWT string."""
    return decode_token(token).get('role', 'student')


def extract_jti(token: str) -> str:
    """Return the JTI from a raw JWT string — used to pre-revoke before expiry."""
    return decode_token(token)['jti']


def is_token_valid(token: str) -> bool:
    """Return True if the token decodes without error, False otherwise."""
    try:
        decode_token(token)
        return True
    except (DecodeError, ExpiredSignatureError, Exception):
        return False
