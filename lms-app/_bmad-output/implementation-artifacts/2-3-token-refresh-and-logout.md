# Story 2.3: Token Refresh and Logout

Status: done

## Story

As a logged-in user,
I want my session to refresh automatically and be able to log out cleanly,
So that I stay logged in during active use without security risk.

## Acceptance Criteria

**AC1 — Successful token refresh**
Given a POST to `/api/v1/auth/refresh` with a valid `refresh_token_cookie`
When the refresh token is not expired and not blocklisted
Then HTTP 200 is returned with a new `access_token` in the response body
And a new `refresh_token_cookie` replaces the old one (token rotation)
And the old refresh token JTI is added to the blocklist

**AC2 — Missing or expired refresh cookie**
Given a POST to `/api/v1/auth/refresh` with a missing or expired `refresh_token_cookie`
When the token is validated
Then HTTP 401 is returned with `{"error": {"type": "UNAUTHORIZED", "status": 401}}`

**AC3 — Blocklisted refresh token**
Given a POST to `/api/v1/auth/refresh` with a refresh token whose JTI is in the blocklist
When the token is validated
Then HTTP 401 is returned

**AC4 — Refresh for inactive user**
Given a valid refresh token for a user with `is_active = False`
When `/api/v1/auth/refresh` is called
Then HTTP 401 is returned

**AC5 — Successful logout**
Given a POST to `/api/v1/auth/logout` with a valid `refresh_token_cookie`
When the request is processed
Then HTTP 200 is returned with `{"data": null, "meta": null, "error": null}`
And the `refresh_token_cookie` is cleared (max-age=0 / expired cookie)
And the revoked refresh token JTI is added to the blocklist so it cannot be reused

**AC6 — Logout without refresh cookie**
Given a POST to `/api/v1/auth/logout` with no `refresh_token_cookie`
Then HTTP 401 is returned

**AC7 — Response envelope structure**
All success responses follow the standard envelope: `{"data": ..., "meta": null, "error": null}`

## Tasks / Subtasks

- [x] Task 1: Add `POST /api/v1/auth/refresh` route (AC: 1, 2, 3, 4, 7)
  - [x] Import `jwt_required` from `flask_jwt_extended` in `routes.py`
  - [x] Add `@auth_bp.route('/refresh', methods=['POST'])` with `@jwt_required(refresh=True, locations=['cookies'])` and rate limit
  - [x] Get `user_id` via `jwt_service.get_current_user_id()` and `old_jti` via `jwt_utils.current_jti()`
  - [x] Look up user; return 401 if not found or `is_active=False`
  - [x] Call `jwt_service.rotate_tokens(response, user, old_jti, current_app.config['JWT_REFRESH_TOKEN_EXPIRES'])` to revoke old JTI and attach new tokens
  - [x] Return new `access_token` in response body

- [x] Task 2: Add `POST /api/v1/auth/logout` route (AC: 5, 6, 7)
  - [x] Add `@auth_bp.route('/logout', methods=['POST'])` with `@jwt_required(refresh=True, locations=['cookies'])` and rate limit
  - [x] Get `jti` via `jwt_utils.current_jti()`
  - [x] Call `jwt_service.revoke_current_token(jti, current_app.config['JWT_REFRESH_TOKEN_EXPIRES'])` to blocklist the token
  - [x] Call `jwt_utils.clear_auth_cookies(response)` to clear the `refresh_token_cookie`
  - [x] Return HTTP 200 with null data envelope

- [x] Task 3: Write integration tests (AC: 1–7)
  - [x] Create `backend/tests/integration/test_auth_refresh_logout.py`
  - [x] Test refresh success returns 200 with new `access_token` (JWT format: 3 dots)
  - [x] Test refresh rotates cookie (new cookie set in response)
  - [x] Test refresh with missing cookie returns 401
  - [x] Test refresh with inactive user returns 401
  - [x] Test refresh with blocklisted token returns 401
  - [x] Test logout success returns 200 and clears `refresh_token_cookie`
  - [x] Test logout without cookie returns 401
  - [x] Test used refresh token cannot be reused after rotation (replay attack)
  - [x] Test logout token cannot be used for refresh after logout

### Review Findings (AI) — 2026-04-20

#### Decision Needed
- [x] [Review][Decision] JWT @jwt_required failures return flask-jwt-extended default `{'msg': '...'}` envelope, not our `{data, meta, error}` spec format — resolved: registered `jwt.unauthorized_loader`, `jwt.invalid_token_loader`, `jwt.revoked_token_loader` callbacks in `app/__init__.py`

#### Patches
- [x] [Review][Patch][High] Vacuous rotation test — improved `test_refresh_token_rotation_blocks_old_token` to capture old cookie from login, rotate, then replay via fresh client; asserts 401 + UNAUTHORIZED envelope
- [x] [Review][Patch][High] Memory blocklist leaks state across tests — added `autouse=True` fixture in `conftest.py` to clear `jwt_utils._memory_blocklist` before/after each test
- [x] [Review][Patch][Med] `_register_and_login` swallows failures — added `assert reg.status_code == 201` and `assert login.status_code == 200` in helper
- [x] [Review][Patch][Low] `test_logout_clears_refresh_cookie` uses `or` — tightened to filter specifically for `refresh_token_cookie` headers and assert expiry
- [x] [Review][Patch][Low] `test_refresh_inactive_user_returns_401` — added `body['error']['type'] == 'UNAUTHORIZED'` and `body['data'] is None` assertions
- [x] [Review][Patch][Low] New access token not verified to differ from original — added `new_token != original_token` assertion in `test_refresh_returns_new_access_token`

#### Deferred
- [x] [Review][Defer] Non-atomic rotate_tokens: old JTI blocklisted even if new token issuance fails [backend/app/services/jwt_service.py] — deferred, pre-existing jwt_service design (story 2-2)
- [x] [Review][Defer] Blocklist TTL uses full configured lifetime, not remaining token expiry — deferred, conservative/acceptable tradeoff; fix requires `exp` claim extraction
- [x] [Review][Defer] Redis connection not pooled in `_redis_client()` — deferred, pre-existing (story 2-2)
- [x] [Review][Defer] Silent Redis failure causes logout to return 200 with unrevoked token — deferred, pre-existing (story 2-2)
- [x] [Review][Defer] Expired refresh token path not directly tested (AC2) — deferred, requires fabricating expired token; acceptable gap
- [x] [Review][Defer] Rate limiter key `get_remote_address` bypassable via X-Forwarded-For spoofing — deferred, pre-existing limiter config

## Dev Notes

### What Already Exists — DO NOT Recreate

| File | Existing State |
|---|---|
| `backend/app/utils/jwt_utils.py` | `add_to_blocklist(jti, ttl)`, `is_blocklisted(jti)`, `clear_auth_cookies(response)`, `verify_refresh_token()`, `current_jti()`, `attach_refresh_cookie()` — import via `jwt_service`, not directly in routes |
| `backend/app/services/jwt_service.py` | `rotate_tokens(response, user, old_jti, refresh_ttl)`, `revoke_current_token(jti, ttl_seconds)`, `get_current_user_id()`, `generate_tokens(user)`, `attach_tokens(response, user)` — USE THESE |
| `backend/app/__init__.py` | `@jwt.token_in_blocklist_loader` wired to `jwt_utils.is_blocklisted()` — blocklist is already checked automatically by flask_jwt_extended on every JWT-protected request |
| `backend/app/api/v1/auth/routes.py` | `auth_bp` blueprint with `/register` and `/login` — ADD new routes HERE, no new file |
| `backend/app/api/v1/auth/schemas.py` | `RegisterSchema`, `LoginSchema` — no new schemas needed for refresh/logout (no request body) |
| `backend/app/extensions.py` | `db`, `jwt`, `limiter` — import from here |
| `backend/app/models/user.py` | `User`, `Role`, `UserRole` — DO NOT modify |
| `backend/app/config.py` | `JWT_REFRESH_TOKEN_EXPIRES=604800`, `JWT_ACCESS_TOKEN_EXPIRES=900`, `JWT_REFRESH_COOKIE_PATH='/api/v1/auth'` — all set |
| `backend/tests/conftest.py` | `db_client`, `db_session`, `db_app` fixtures — use as-is |

### Files to Modify

| File | Action |
|---|---|
| `backend/app/api/v1/auth/routes.py` | Add `POST /refresh` and `POST /logout` routes to existing `auth_bp`; add `jwt_required` import |

### New Test Files

| File | Purpose |
|---|---|
| `backend/tests/integration/test_auth_refresh_logout.py` | Integration tests for both endpoints |

### Critical Implementation Details

**Token Rotation on Refresh (SECURITY REQUIREMENT):**
- `rotate_tokens(response, user, old_jti, refresh_ttl)` already: (1) adds `old_jti` to blocklist, (2) calls `attach_tokens()` to issue a fresh pair
- The blocklist loader in `app/__init__.py` ensures a revoked JTI fails automatically on any subsequent use
- Replay attacks are blocked because once a refresh token is rotated, its JTI is blocklisted

**Logout Uses Refresh Token (Not Access Token):**
- Logout should verify the **refresh token** (via `@jwt_required(refresh=True)`) since the refresh token is the session anchor
- Access tokens are short-lived (15 min) and stateless — revoking them adds no meaningful security
- Verifying the refresh token at logout provides auth proof AND gives us the JTI to revoke

**Cookie Behavior (Flask-JWT-Extended):**
- `JWT_REFRESH_COOKIE_PATH = '/api/v1/auth'` — browser only sends the cookie to `/api/v1/auth/*` routes
- `set_refresh_cookies()` (called internally by `attach_refresh_cookie`) sets `refresh_token_cookie` as HttpOnly
- `unset_jwt_cookies()` (called internally by `clear_auth_cookies`) sets cookie with max-age=0 to expire it

**Rate Limiting — Consistency with Existing Routes:**
- `/register` uses `@limiter.limit('10 per minute')`
- `/login` uses `@limiter.limit('20 per minute')`
- Apply `@limiter.limit('20 per minute')` to `/refresh` and `/logout` for consistency

**`current_app` Import:**
- Use `from flask import current_app` to read `current_app.config['JWT_REFRESH_TOKEN_EXPIRES']` inside routes
- Do NOT hardcode the TTL value

**Route Implementation Pattern (follow from existing `/login`):**
```python
from flask import Blueprint, request, jsonify, make_response, current_app
from flask_jwt_extended import jwt_required
from app.extensions import db, limiter
from app.models.user import User
from app.services import auth_service, jwt_service
from app.utils import jwt_utils
from .schemas import RegisterSchema, LoginSchema

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit('20 per minute')
def refresh():
    user_id = jwt_service.get_current_user_id()
    old_jti = jwt_utils.current_jti()
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return jsonify({'data': None, 'meta': None, 'error': {
            'type': 'UNAUTHORIZED', 'title': 'Unauthorized',
            'detail': 'Invalid or inactive user', 'status': 401,
        }}), 401
    refresh_ttl = current_app.config['JWT_REFRESH_TOKEN_EXPIRES']
    response = make_response(jsonify({'data': None, 'meta': None, 'error': None}), 200)
    response, access_token = jwt_service.rotate_tokens(response, user, old_jti, refresh_ttl)
    response.data = jsonify({
        'data': {'access_token': access_token},
        'meta': None,
        'error': None,
    }).data
    return response


@auth_bp.route('/logout', methods=['POST'])
@jwt_required(refresh=True)
@limiter.limit('20 per minute')
def logout():
    jti = jwt_utils.current_jti()
    refresh_ttl = current_app.config['JWT_REFRESH_TOKEN_EXPIRES']
    jwt_service.revoke_current_token(jti, refresh_ttl)
    response = make_response(jsonify({'data': None, 'meta': None, 'error': None}), 200)
    jwt_utils.clear_auth_cookies(response)
    return response
```

### Testing Pattern — How to Get Refresh Cookie in Tests

```python
# 1. Register + Login to get refresh cookie
def _login(db_client):
    db_client.post('/api/v1/auth/register', json={...})
    return db_client.post('/api/v1/auth/login', json={...})

# 2. Use db_client (flask test client) — it automatically tracks cookies between requests
resp = db_client.post('/api/v1/auth/refresh')  # cookie sent automatically by test client

# 3. Test clearing: check Set-Cookie header contains expired cookie
cookie = resp.headers.get('Set-Cookie', '')
assert 'refresh_token_cookie' in cookie
```

### Error Response Format

All error responses must follow the standard envelope (consistent with `/login`):
```json
{"data": null, "meta": null, "error": {"type": "UNAUTHORIZED", "title": "Unauthorized", "detail": "...", "status": 401}}
```
Flask-JWT-Extended emits its own 401/422 responses when `@jwt_required` fails — these are handled by the global `register_error_handlers` in `app/middleware/error_handlers.py`. No per-route error handling needed for JWT validation failures.

### Previous Story Learnings (from 2-2)

- Route responses must rewrite `response.data` after `attach_tokens()` / `rotate_tokens()` — the initial `make_response()` body is a placeholder
- The `db_client` test fixture carries cookies automatically between requests in Flask test client
- Always import `db` from `app.extensions`, not from `flask_sqlalchemy` directly
- `jwt_service` is the only import needed in routes for token operations — never call `jwt_utils` directly from routes
- Rate limit decorators go **after** `@auth_bp.route()` and **after** `@jwt_required()` (order: route → jwt → limiter)

### Project Structure Notes

- `backend/app/api/v1/auth/routes.py` is the only file to modify for this story
- No new service functions needed — `jwt_service.py` already exposes `rotate_tokens` and `revoke_current_token`
- No new schemas needed — refresh and logout have no request body to validate
- Tests go in `backend/tests/integration/` (no unit tests for service layer since no new service logic)

### References

- [Source: architecture.md] Authentication Flow — `/api/v1/auth/refresh` endpoint spec
- [Source: epics.md#Story 2.3] AC definitions for refresh and logout
- [Source: backend/app/services/jwt_service.py] `rotate_tokens()`, `revoke_current_token()` implementations
- [Source: backend/app/utils/jwt_utils.py] `clear_auth_cookies()`, `current_jti()`, blocklist functions
- [Source: backend/app/__init__.py:35-37] `token_in_blocklist_loader` wired to `is_blocklisted`
- [Source: backend/app/config.py] `JWT_REFRESH_TOKEN_EXPIRES=604800`, `JWT_REFRESH_COOKIE_PATH='/api/v1/auth'`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `@jwt_required(refresh=True)` defaults to header location in flask-jwt-extended 4.x; must use `locations=['cookies']` explicitly for cookie-based refresh tokens.
- `resp.headers.get('Set-Cookie')` returns only the first header; used `resp.headers.getlist('Set-Cookie')` to check all cleared cookies on logout.

### Completion Notes List

- Added `POST /api/v1/auth/refresh`: verifies refresh cookie via `@jwt_required(refresh=True, locations=['cookies'])`, rotates token pair using `jwt_service.rotate_tokens()` (old JTI blocklisted), returns new `access_token` in body and new `refresh_token_cookie`.
- Added `POST /api/v1/auth/logout`: verifies refresh cookie, revokes JTI via `jwt_service.revoke_current_token()`, clears cookies via `jwt_utils.clear_auth_cookies()`, returns HTTP 200.
- 13 integration tests added covering: success, cookie rotation, inactive user, blocklisted token, missing cookie, replay attack prevention, and idempotent logout.
- Full regression suite: 105 tests pass, zero failures.

### File List

- `backend/app/api/v1/auth/routes.py` (modified — added `/refresh` and `/logout` routes; added `jwt_required`, `current_app`, `jwt_utils` imports)
- `backend/tests/integration/test_auth_refresh_logout.py` (new — 13 integration tests)

### Change Log

- 2026-04-19: Implemented Story 2.3 — added POST /api/v1/auth/refresh (token rotation) and POST /api/v1/auth/logout (JTI revocation + cookie clearing). 13 integration tests added. All 105 tests pass.
