# Story 2.4: Role-Based Access Control Middleware

Status: done

## Story

As a system,
I want all API routes protected by JWT verification and role-based authorization,
So that users can only access resources appropriate to their role.

## Acceptance Criteria

**AC1 — Protected endpoint without JWT returns 401**
Given a request to any route decorated with `@require_auth` or `@require_role(...)` that has no `Authorization` header
When the JWT verification runs
Then HTTP 401 is returned with `{"data": null, "meta": null, "error": {"type": "UNAUTHORIZED", "status": 401}}`

**AC2 — Student JWT on teacher-only route returns 403**
Given a request to a route decorated with `@require_role('teacher')` with a valid student JWT
When the role check runs
Then HTTP 403 is returned with `{"data": null, "meta": null, "error": {"type": "FORBIDDEN", "detail": "Insufficient role", "status": 403}}`

**AC3 — Teacher JWT on admin-only route returns 403**
Given a request to a route decorated with `@require_role('admin')` with a valid teacher JWT
When the role check runs
Then HTTP 403 is returned with the FORBIDDEN error envelope

**AC4 — Correct role JWT passes through to route handler**
Given a valid teacher JWT requesting a teacher-only route
When authorization passes
Then HTTP 200 is returned — the route handler executes normally

**AC5 — Public routes remain accessible without JWT**
Given a route with no `@require_auth` / `@require_role` decorator
When called without any JWT
Then the route handler executes normally (no 401 interference)

**AC6 — Multi-role allow list**
Given a route decorated with `@require_role('teacher', 'admin')` and a valid admin JWT
When the role check runs
Then HTTP 200 is returned — either role satisfies the requirement

**AC7 — Response envelope consistency**
All 401 and 403 error responses follow `{"data": null, "meta": null, "error": {"type": ..., "title": ..., "detail": ..., "status": ...}}`

## Tasks / Subtasks

- [x] Task 1: Implement `auth_middleware.py` (AC: 1, 5, 7)
  - [x] Replace stub with `require_auth` decorator wrapping `verify_jwt_in_request()`
  - [x] Preserve function name/docstring with `@wraps`

- [x] Task 2: Implement `rbac.py` (AC: 1, 2, 3, 4, 6, 7)
  - [x] Replace stub with `require_role(*roles)` decorator factory
  - [x] Internally call `verify_jwt_in_request()` — handles 401 before role check
  - [x] Extract `role` claim from `get_jwt()` and check against `roles`
  - [x] Return 403 FORBIDDEN envelope if role not in allowed set
  - [x] Call route handler if role matches

- [x] Task 3: Integration tests (AC: 1–7)
  - [x] Create `backend/tests/integration/test_rbac_middleware.py`
  - [x] Register temporary test routes on module-scoped `rbac_app` fixture using `@require_auth` and `@require_role`
  - [x] Test `require_auth`: missing token → 401 UNAUTHORIZED
  - [x] Test `require_auth`: valid token → 200
  - [x] Test `require_role('teacher')`: student token → 403 FORBIDDEN
  - [x] Test `require_role('teacher')`: teacher token → 200
  - [x] Test `require_role('admin')`: teacher token → 403
  - [x] Test `require_role('admin')`: admin token → 200
  - [x] Test `require_role('teacher', 'admin')`: both roles → 200 (multi-role)
  - [x] Test `require_role(...)`: no token → 401 (not 403)
  - [x] Test public route (no decorator): no token → 200

### Review Findings (AI) — 2026-04-20

#### Patches
- [x] [Review][Patch][Med] `require_role()` called with empty `roles` tuple silently denies all authenticated users with 403 — resolved: added `if not roles: raise ValueError(...)` guard at top of decorator factory [backend/app/middleware/rbac.py:6]
- [x] [Review][Patch][Low] `_login` helper returns token without asserting it is non-None — resolved: added `assert token is not None and token.count('.') == 2` [backend/tests/integration/test_rbac_middleware.py:41]
- [x] [Review][Patch][Med] No test asserts that a refresh token is rejected by `@require_auth` — resolved: added `test_require_auth_rejects_refresh_token` [backend/tests/integration/test_rbac_middleware.py]

#### Deferred
- [x] [Review][Defer] No `expired_token_loader` registered in `app/__init__.py` — expired access tokens return `{"msg": "Token has expired"}` (flask-jwt-extended default) instead of the project envelope — deferred, pre-existing from Story 2.3 [backend/app/__init__.py]
- [x] [Review][Defer] `claims.get('role')` returns `None` for tokens without `role` claim while `current_role()` in jwt_utils defaults to `'student'` — two code paths disagree on the default; decorator behavior (403) is conservative but inconsistent — deferred, pre-existing design [backend/app/middleware/rbac.py:14, backend/app/utils/jwt_utils.py:80]
- [x] [Review][Defer] Refresh token accepted on access-token-protected routes if `JWT_TOKEN_LOCATION` config ever includes cookies — currently safe (headers only) but no guard — deferred, hypothetical future config change
- [x] [Review][Defer] Stacking `@require_auth` + `@require_role` calls `verify_jwt_in_request()` twice, triggering two blocklist Redis lookups — deferred, docs say not to stack; not a correctness bug
- [x] [Review][Defer] No test for blocklisted access token against `require_auth`/`require_role` — deferred, blocklist check is tested by Story 2.3 suite; redundant coverage not required here
- [x] [Review][Defer] No test for expired token returning correct envelope — deferred, fabricating expired tokens is non-trivial; also tied to the pre-existing expired_token_loader gap
- [x] [Review][Defer] `_primary_role()` in `jwt_service.py` is non-deterministic for multi-role users (no `ORDER BY` on `lazy='dynamic'` relationship) — deferred, pre-existing from Story 2.2; single-role invariant holds for now

## Dev Notes

### What Already Exists — DO NOT Recreate

| File | Existing State |
|---|---|
| `backend/app/middleware/auth_middleware.py` | Stub ("# Stub — implemented in Story 1.3") — REPLACE entirely |
| `backend/app/middleware/rbac.py` | Stub ("# Stub — implemented in Story 1.3") — REPLACE entirely |
| `backend/app/utils/jwt_utils.py` | `verify_access_token(optional)` → wraps `verify_jwt_in_request()`, `current_role()` → reads `get_jwt()['role']` — AVAILABLE but use `flask_jwt_extended` directly in middleware |
| `backend/app/services/jwt_service.py` | `get_current_role()` → calls `jwt_utils.current_role()` — available but don't import service into middleware (circular dependency risk) |
| `backend/app/__init__.py` | `jwt.unauthorized_loader`, `jwt.invalid_token_loader`, `jwt.revoked_token_loader` registered — 401 envelope is already standardized; `require_role` does NOT need to manually format 401 errors |
| `backend/app/extensions.py` | `db`, `jwt`, `limiter` — import from here if needed |
| `backend/app/models/user.py` | `User`, `Role`, `UserRole` — DO NOT modify |
| `backend/tests/conftest.py` | `db_app`, `db_client`, `db_session` fixtures — use as-is |
| `backend/app/services/auth_service.py` | `register_user(email, password, first_name, last_name)` always assigns `role='student'`; for teacher/admin tests, manually update `UserRole` and `Role` in DB |

### Files to Modify

| File | Action |
|---|---|
| `backend/app/middleware/auth_middleware.py` | Replace stub — implement `require_auth` decorator |
| `backend/app/middleware/rbac.py` | Replace stub — implement `require_role(*roles)` decorator factory |

### New Test Files

| File | Purpose |
|---|---|
| `backend/tests/integration/test_rbac_middleware.py` | Integration tests for both decorators |

### Critical Implementation Details

**`auth_middleware.py` — Full Implementation:**
```python
from functools import wraps
from flask_jwt_extended import verify_jwt_in_request


def require_auth(fn):
    """Require a valid access token (Authorization: Bearer <token>). Returns 401 if missing/invalid."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        return fn(*args, **kwargs)
    return wrapper
```

**`rbac.py` — Full Implementation:**
```python
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt


def require_role(*roles):
    """Require a valid JWT AND membership in one of the specified roles.
    Returns 401 if no JWT; 403 FORBIDDEN if role not in allowed set.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()   # raises → jwt.unauthorized_loader handles 401 envelope
            claims = get_jwt()
            if claims.get('role') not in roles:
                return jsonify({
                    'data': None,
                    'meta': None,
                    'error': {
                        'type': 'FORBIDDEN',
                        'title': 'Forbidden',
                        'detail': 'Insufficient role',
                        'status': 403,
                    },
                }), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
```

**Why `verify_jwt_in_request()` and NOT `@jwt_required()` inside the decorator:**
- `jwt_required()` is itself a decorator factory — nesting it creates double-decoration issues
- `verify_jwt_in_request()` is the underlying function that raises `NoAuthorizationError` when JWT is missing
- The `jwt.unauthorized_loader` callback registered in `app/__init__.py` intercepts that exception and returns the standard `{"data": null, ...}` 401 envelope — no per-decorator error handling needed

**Why 403 is formatted inline (not delegated to error handler):**
- Flask's generic error handler catches `HTTPException` — a plain 403 `jsonify` is NOT an HTTPException
- The 403 response must be returned directly from the decorator with the standard envelope
- This is consistent with how routes return 401/422 directly in existing code

**Role Claim Source:**
- The `role` claim is embedded in the access token at login time by `jwt_service.generate_tokens()`:
  ```python
  additional_claims = {'role': _primary_role(user)}
  ```
  where `_primary_role()` returns the name of the user's first role (defaults to 'student')
- The claim is read via `get_jwt().get('role', 'student')` — do NOT query the DB on every request

**Decorator Ordering (for future routes):**
```python
@blueprint.route('/courses', methods=['POST'])
@require_role('teacher')        # handles JWT verification + role check
@limiter.limit('20 per minute') # rate limit AFTER auth
def create_course():
    ...
```
Do NOT stack `@require_auth` + `@require_role` — `require_role` already calls `verify_jwt_in_request()`.

**Access Token Location — Bearer Header Only (NOT cookies):**
- Access tokens are sent in the `Authorization: Bearer <token>` header
- Refresh tokens use the `refresh_token_cookie` — that is only used in `/auth/refresh` and `/auth/logout`
- `verify_jwt_in_request()` defaults to `locations=['headers']` — this is correct for all non-auth routes

### Testing Pattern — Registering Test Routes on `db_app`

```python
import pytest
import json

# ── helpers ─────────────────────────────────────────────────────────────────

STUDENT_USER = {
    'email': 'student@rbac.com',
    'password': 'password123',
    'first_name': 'Student',
    'last_name': 'User',
}

def _register_and_login(db_client, payload=STUDENT_USER):
    reg = db_client.post('/api/v1/auth/register', json=payload)
    assert reg.status_code == 201
    login = db_client.post('/api/v1/auth/login', json={
        'email': payload['email'], 'password': payload['password'],
    })
    assert login.status_code == 200
    return json.loads(login.data)['data']['access_token']

def _set_user_role(db_app, email, role_name):
    """Update user's role to teacher/admin directly in DB."""
    from app.extensions import db as _db
    from app.models.user import User, Role, UserRole
    with db_app.app_context():
        user = _db.session.query(User).filter_by(email=email).first()
        role = _db.session.query(Role).filter_by(name=role_name).first()
        if not role:
            role = Role(name=role_name)
            _db.session.add(role)
            _db.session.flush()
        # Remove existing roles then add new one
        _db.session.query(UserRole).filter_by(user_id=user.id).delete()
        _db.session.add(UserRole(user_id=user.id, role_id=role.id))
        _db.session.commit()

@pytest.fixture(scope='module')
def rbac_app(db_app):
    """db_app with test routes wired using the RBAC decorators."""
    from app.middleware.auth_middleware import require_auth
    from app.middleware.rbac import require_role
    from flask import jsonify

    @db_app.route('/test/require-auth', methods=['GET'])
    @require_auth
    def test_require_auth_route():
        return jsonify({'data': 'ok', 'meta': None, 'error': None}), 200

    @db_app.route('/test/teacher-only', methods=['GET'])
    @require_role('teacher')
    def test_teacher_only_route():
        return jsonify({'data': 'teacher ok', 'meta': None, 'error': None}), 200

    @db_app.route('/test/admin-only', methods=['GET'])
    @require_role('admin')
    def test_admin_only_route():
        return jsonify({'data': 'admin ok', 'meta': None, 'error': None}), 200

    @db_app.route('/test/teacher-or-admin', methods=['GET'])
    @require_role('teacher', 'admin')
    def test_teacher_or_admin_route():
        return jsonify({'data': 'multi ok', 'meta': None, 'error': None}), 200

    @db_app.route('/test/public', methods=['GET'])
    def test_public_route():
        return jsonify({'data': 'public', 'meta': None, 'error': None}), 200

    return db_app
```

**NOTE:** Use `scope='module'` on `rbac_app` fixture — routes can only be registered once on a Flask app object; re-registration on each test would raise an `AssertionError`.

**Getting the access token for Authorization header:**
```python
# In test:
token = _register_and_login(rbac_app.test_client(), STUDENT_USER)
client = rbac_app.test_client()
resp = client.get('/test/teacher-only', headers={'Authorization': f'Bearer {token}'})
assert resp.status_code == 403
```

**Token does NOT auto-refresh between requests in test client** — unlike cookies, the `Authorization` header must be set explicitly on each request.

**After `_set_user_role`, user must re-login** — the role claim is baked into the token at login time; updating the DB doesn't update existing tokens.

### Existing Test Patterns from Previous Stories

- `backend/tests/integration/test_middleware.py` shows registering ad-hoc routes on `app` fixture using `@app.route(...)` directly in a test function — same approach works here but use the `module`-scoped fixture
- The `autouse=True` `clear_jwt_blocklist` fixture in `conftest.py` runs before/after every test — blocklist is always clean
- The non-DB `app` and `client` fixtures use `'development'` config; `db_app` / `db_client` use `'testing'` config (SQLite in-memory)
- Access tokens are in response body `data.access_token` — not in cookies

### Error Response Formats

**401 (handled by jwt.unauthorized_loader in app/__init__.py):**
```json
{"data": null, "meta": null, "error": {"type": "UNAUTHORIZED", "title": "Unauthorized", "detail": "...", "status": 401}}
```

**403 (returned directly from `require_role` decorator):**
```json
{"data": null, "meta": null, "error": {"type": "FORBIDDEN", "title": "Forbidden", "detail": "Insufficient role", "status": 403}}
```

### Previous Story Learnings (from 2.3)

- `verify_jwt_in_request()` without `refresh=True` checks access token from `Authorization: Bearer` header by default
- `get_jwt()` returns the full claims dict of the current request's verified JWT
- `resp.headers.getlist('Set-Cookie')` for checking multiple headers (not relevant here, but good habit)
- Tests using `db_client` that need different roles must update the DB AND re-login (tokens are stateless, role is baked at issuance)
- Rate limiter decorators go AFTER route and AFTER auth decorators (route → auth/rbac → limiter)
- The JWT error callbacks in `app/__init__.py` handle `verify_jwt_in_request()` failures — no extra 401 handling in decorators

### Project Structure Notes

- Only `auth_middleware.py` and `rbac.py` are modified — both are stubs today
- No new service functions needed — role comes from JWT claim, no DB lookup required
- No new schemas needed — decorators produce errors directly, not via marshmallow
- Tests go in `backend/tests/integration/`
- Do NOT import `require_role` or `require_auth` in any existing files — this story just implements the decorators; application to real routes happens in Stories 3.x onwards

### References

- [Source: architecture.md] Authentication & Security — RBAC via `@require_role('teacher')` decorators
- [Source: architecture.md] Endpoint Authorization Boundary table
- [Source: epics.md#Story 2.4] AC definitions
- [Source: backend/app/__init__.py:40-48] `jwt.unauthorized_loader` registered — standardizes 401 envelopes
- [Source: backend/app/services/jwt_service.py:10] `additional_claims = {'role': _primary_role(user)}` — role baked into access token
- [Source: backend/app/utils/jwt_utils.py:80-82] `current_role()` reads `get_jwt().get('role', 'student')`
- [Source: backend/tests/integration/test_middleware.py] Pattern for registering test routes on app fixture

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `db_app` fixture in conftest.py is function-scoped; module-scoped `rbac_app` fixture was created directly in the test file via `create_app('testing')` to avoid `ScopeMismatch` error.
- After `_set_user_role` changes a user's role in the DB, a fresh login is needed because the role claim is baked into the JWT at issuance — `_login()` helper added (no re-registration).

### Completion Notes List

- Implemented `require_auth` decorator in `backend/app/middleware/auth_middleware.py`: wraps `verify_jwt_in_request()` with `@wraps` to preserve function metadata. Returns 401 via jwt.unauthorized_loader when token is missing/invalid.
- Implemented `require_role(*roles)` factory in `backend/app/middleware/rbac.py`: calls `verify_jwt_in_request()` (handles 401 via existing callbacks), reads `get_jwt()['role']` claim, returns 403 FORBIDDEN envelope if role not in allowed set.
- 16 integration tests added in `test_rbac_middleware.py` covering: `require_auth` (no token, valid token, invalid token), `require_role('teacher')` (student/teacher/admin tokens, no token), `require_role('admin')` (teacher/admin tokens, no token), multi-role `require_role('teacher', 'admin')`, public route (no decorator), and both 401/403 envelope structure.
- Full regression suite: 121 tests pass, zero failures.

### File List

- `backend/app/middleware/auth_middleware.py` (modified — replaced stub with `require_auth` decorator)
- `backend/app/middleware/rbac.py` (modified — replaced stub with `require_role(*roles)` decorator factory)
- `backend/tests/integration/test_rbac_middleware.py` (new — 16 integration tests)

### Change Log

- 2026-04-20: Implemented Story 2.4 — added `require_auth` and `require_role(*roles)` decorators. 16 integration tests added. All 121 tests pass.
