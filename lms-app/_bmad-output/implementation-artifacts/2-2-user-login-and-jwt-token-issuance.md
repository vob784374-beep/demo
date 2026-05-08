# Story 2.2: User Login and JWT Token Issuance

## Story Metadata

| Field | Value |
|---|---|
| **Story ID** | 2.2 |
| **Story Key** | 2-2-user-login-and-jwt-token-issuance |
| **Epic** | Epic 2: User Authentication & Authorization |
| **Status** | ready-for-dev |
| **Date Created** | 2026-04-19 |

---

## User Story

**As a** registered user,
**I want** to log in with my email and password,
**So that** I receive a JWT access token and can access protected endpoints.

---

## Acceptance Criteria

**AC1 — Successful login**
Given `POST /api/v1/auth/login` with `{"email": "user@example.com", "password": "secret123"}`
When credentials match an active user record
Then HTTP 200 is returned with:
```json
{"data": {"access_token": "...", "user": {"id": 1, "email": "user@example.com", "role": "student"}}, "meta": null, "error": null}
```
And an HttpOnly cookie named `refresh_token_cookie` is set with 7-day expiry
And the access token expires in 15 minutes

**AC2 — Wrong password**
Given `POST /api/v1/auth/login` with a registered email but incorrect password
When bcrypt comparison fails
Then HTTP 401 is returned with:
```json
{"data": null, "meta": null, "error": {"type": "UNAUTHORIZED", "title": "Unauthorized", "detail": "Invalid credentials", "status": 401}}
```

**AC3 — Email not found**
Given `POST /api/v1/auth/login` with an email not in the database
Then HTTP 401 is returned with the same generic error as AC2 (no user enumeration)

**AC4 — Inactive user**
Given a user with `is_active = False`
When they attempt to log in with correct credentials
Then HTTP 401 with the same generic "Invalid credentials" error

**AC5 — Missing required fields**
Given any of `email` or `password` is absent
When schema validates
Then HTTP 422 listing missing fields in `error.detail`

**AC6 — Rate limiting**
Given more than 20 login requests from the same IP within 1 minute
Then HTTP 429 is returned with retry-after header

---

## Technical Context & Architecture Guardrails

### What Already Exists (Do NOT Recreate)

| File | State |
|---|---|
| `backend/app/models/user.py` | `User`, `Role`, `UserRole` — DO NOT modify |
| `backend/app/extensions.py` | `db`, `jwt`, `limiter` — import from here |
| `backend/app/services/auth_service.py` | `register_user()` exists — ADD `login_user()` alongside |
| `backend/app/services/jwt_service.py` | `attach_tokens(response, user)` — USE this, do not reinvent |
| `backend/app/utils/jwt_utils.py` | All JWT helpers — import via `jwt_service`, not directly in routes |
| `backend/app/api/v1/auth/routes.py` | `auth_bp` blueprint + `POST /register` — ADD `/login` to same blueprint |
| `backend/app/api/v1/auth/schemas.py` | `RegisterSchema` exists — ADD `LoginSchema` alongside |
| `backend/app/middleware/error_handlers.py` | Global error handler — do NOT add per-route error returns for non-auth errors |
| `backend/tests/conftest.py` | `db_client`, `db_session`, `db_app` fixtures — use as-is |
| `backend/app/config.py` | `JWT_ACCESS_TOKEN_EXPIRES=900`, `JWT_REFRESH_TOKEN_EXPIRES=604800`, cookie config — all set |

### Files to Modify

| File | Action |
|---|---|
| `backend/app/api/v1/auth/schemas.py` | Add `LoginSchema` |
| `backend/app/services/auth_service.py` | Add `login_user()` |
| `backend/app/api/v1/auth/routes.py` | Add `POST /login` route to existing `auth_bp` |

### New Test Files

| File | Purpose |
|---|---|
| `backend/tests/integration/test_auth_login.py` | Integration tests for `POST /login` |
| `backend/tests/unit/services/test_auth_service_login.py` | Unit tests for `login_user()` |

---

## Critical Technical Constraints (NON-NEGOTIABLE)

### Security — Credential Validation

**NEVER reveal which field failed.** Both "email not found" and "wrong password" must return the identical generic response. This prevents user enumeration attacks.

**Timing attack mitigation:** When email is not found, still perform a dummy bcrypt comparison so response time is identical regardless of whether the email exists:

```python
import bcrypt

DUMMY_HASH = '$2b$12$' + 'A' * 53  # valid bcrypt format, never matches any real password

def login_user(email: str, password: str) -> dict:
    user = User.query.filter_by(email=email).first()

    # Always do bcrypt comparison — prevents timing-based user enumeration
    stored_hash = user.password_hash if user else DUMMY_HASH
    password_matches = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))

    if not user or not password_matches or not user.is_active:
        raise ValueError('Invalid credentials')

    role = next(iter(user.roles), None)
    return {
        'id': user.id,
        'email': user.email,
        'role': role.name if role else 'student',
    }
```

### Response Structure

Login response differs from registration — user info is nested under `"user"` key:
```json
{
  "data": {
    "access_token": "eyJ...",
    "user": {"id": 1, "email": "user@example.com", "role": "student"}
  },
  "meta": null,
  "error": null
}
```
The refresh token is NOT in the body — it is set as an HttpOnly cookie via `jwt_service.attach_tokens()`.

### Token Issuance Pattern

Reuse the exact same pattern established in Story 2.1 (`POST /register`):

```python
from flask import make_response, jsonify
from app.services import jwt_service
from app.extensions import db
from app.models.user import User

# In the route, after successful login_user() call:
user = db.session.get(User, result['id'])
response = make_response(jsonify({'data': None, 'meta': None, 'error': None}), 200)
response, access_token = jwt_service.attach_tokens(response, user)
response.data = jsonify({
    'data': {'access_token': access_token, 'user': result},
    'meta': None,
    'error': None,
}).data
return response
```

### Error Response for 401

The 401 error shape differs from 422:
```python
return jsonify({
    'data': None,
    'meta': None,
    'error': {
        'type': 'UNAUTHORIZED',
        'title': 'Unauthorized',
        'detail': 'Invalid credentials',
        'status': 401,
    },
}), 401
```

### Rate Limiting

Login uses **20 per minute** (more permissive than register's 10/min, per architecture spec):
```python
@auth_bp.route('/login', methods=['POST'])
@limiter.limit('20 per minute')
def login():
    ...
```

### Schema

`LoginSchema` is simpler than `RegisterSchema` — only email and password:
```python
class LoginSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True)
    # No password length validation — login accepts any string, bcrypt handles it
```

**Do NOT add password length validation to `LoginSchema`.** A user with a valid account must always be able to log in with their password regardless of future schema rule changes.

---

## Implementation Tasks

### Task 1: Add `LoginSchema` to `app/api/v1/auth/schemas.py`

Add alongside the existing `RegisterSchema`:

```python
class LoginSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True)
```

**Test required:** `tests/unit/services/test_auth_service_login.py` — schema validation tests (missing fields, invalid email format).

### Task 2: Add `login_user()` to `app/services/auth_service.py`

```python
DUMMY_HASH = '$2b$12$' + 'A' * 53  # prevents timing-based user enumeration

def login_user(email: str, password: str) -> dict:
    user = User.query.filter_by(email=email).first()

    stored_hash = user.password_hash if user else DUMMY_HASH
    password_matches = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))

    if not user or not password_matches or not user.is_active:
        raise ValueError('Invalid credentials')

    role = next(iter(user.roles), None)
    return {
        'id': user.id,
        'email': user.email,
        'role': role.name if role else 'student',
    }
```

**Tests required:**
- Unit: correct credentials → dict returned
- Unit: wrong password → `ValueError('Invalid credentials')`
- Unit: unknown email → `ValueError('Invalid credentials')`
- Unit: inactive user → `ValueError('Invalid credentials')`
- Unit: error message is generic (same string in all failure cases)

### Task 3: Add `POST /login` to `app/api/v1/auth/routes.py`

Add to the existing `auth_bp` — do not create a new blueprint:

```python
from .schemas import RegisterSchema, LoginSchema

@auth_bp.route('/login', methods=['POST'])
@limiter.limit('20 per minute')
def login():
    try:
        data = LoginSchema().load(request.get_json() or {})
    except ValidationError as err:
        return jsonify({
            'data': None,
            'meta': None,
            'error': {
                'type': 'VALIDATION_ERROR',
                'title': 'Validation Error',
                'detail': _flatten_messages(err.messages),
                'status': 422,
            },
        }), 422

    try:
        result = auth_service.login_user(**data)
    except ValueError:
        return jsonify({
            'data': None,
            'meta': None,
            'error': {
                'type': 'UNAUTHORIZED',
                'title': 'Unauthorized',
                'detail': 'Invalid credentials',
                'status': 401,
            },
        }), 401

    user = db.session.get(User, result['id'])
    response = make_response(jsonify({'data': None, 'meta': None, 'error': None}), 200)
    response, access_token = jwt_service.attach_tokens(response, user)
    response.data = jsonify({
        'data': {'access_token': access_token, 'user': result},
        'meta': None,
        'error': None,
    }).data
    return response
```

**Tests required:** All integration tests in Task 4.

### Task 4: Write integration tests — `backend/tests/integration/test_auth_login.py`

Use `db_client` fixture. Register a user first in each test that needs a valid account:

```python
import json

VALID_USER = {
    'email': 'login@example.com',
    'password': 'password123',
    'first_name': 'Login',
    'last_name': 'User',
}

def _register(db_client, payload=None):
    db_client.post('/api/v1/auth/register', json=payload or VALID_USER)


def test_login_success_returns_200(db_client):
    _register(db_client)
    resp = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': VALID_USER['password'],
    })
    assert resp.status_code == 200


def test_login_returns_access_token_in_body(db_client):
    _register(db_client)
    resp = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': VALID_USER['password'],
    })
    data = json.loads(resp.data)
    assert 'access_token' in data['data']
    assert data['data']['access_token'] is not None
    assert data['data']['access_token'].count('.') == 2  # JWT format


def test_login_returns_user_object(db_client):
    _register(db_client)
    resp = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': VALID_USER['password'],
    })
    user = json.loads(resp.data)['data']['user']
    assert user['email'] == VALID_USER['email']
    assert user['role'] == 'student'
    assert 'id' in user


def test_login_sets_refresh_cookie(db_client):
    _register(db_client)
    resp = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': VALID_USER['password'],
    })
    cookie = resp.headers.get('Set-Cookie', '')
    assert 'refresh_token_cookie' in cookie
    assert 'HttpOnly' in cookie


def test_login_refresh_token_not_in_body(db_client):
    _register(db_client)
    resp = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': VALID_USER['password'],
    })
    body = json.loads(resp.data)
    assert 'refresh_token' not in body['data']


def test_login_wrong_password_returns_401(db_client):
    _register(db_client)
    resp = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': 'wrongpassword',
    })
    assert resp.status_code == 401
    data = json.loads(resp.data)
    assert data['error']['type'] == 'UNAUTHORIZED'
    assert data['error']['detail'] == 'Invalid credentials'


def test_login_unknown_email_returns_401(db_client):
    resp = db_client.post('/api/v1/auth/login', json={
        'email': 'nobody@example.com', 'password': 'password123',
    })
    assert resp.status_code == 401
    data = json.loads(resp.data)
    assert data['error']['type'] == 'UNAUTHORIZED'


def test_login_error_does_not_reveal_which_field_failed(db_client):
    _register(db_client)
    wrong_pw = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': 'wrongpassword',
    })
    unknown_email = db_client.post('/api/v1/auth/login', json={
        'email': 'nobody@example.com', 'password': 'password123',
    })
    assert json.loads(wrong_pw.data)['error']['detail'] == \
           json.loads(unknown_email.data)['error']['detail']


def test_login_missing_email_returns_422(db_client):
    resp = db_client.post('/api/v1/auth/login', json={'password': 'password123'})
    assert resp.status_code == 422
    data = json.loads(resp.data)
    assert data['error']['type'] == 'VALIDATION_ERROR'


def test_login_missing_password_returns_422(db_client):
    resp = db_client.post('/api/v1/auth/login', json={'email': 'x@x.com'})
    assert resp.status_code == 422


def test_login_invalid_email_format_returns_422(db_client):
    resp = db_client.post('/api/v1/auth/login', json={
        'email': 'notanemail', 'password': 'password123',
    })
    assert resp.status_code == 422


def test_login_envelope_structure(db_client):
    _register(db_client)
    resp = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': VALID_USER['password'],
    })
    body = json.loads(resp.data)
    assert 'data' in body
    assert 'meta' in body
    assert 'error' in body


def test_login_password_not_in_response(db_client):
    _register(db_client)
    resp = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': VALID_USER['password'],
    })
    body = json.loads(resp.data)
    assert 'password' not in str(body['data'])
    assert 'password_hash' not in str(body['data'])


def test_login_extra_fields_ignored(db_client):
    _register(db_client)
    resp = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': VALID_USER['password'],
        'role': 'admin', 'is_superuser': True,
    })
    assert resp.status_code == 200
```

### Task 5: Write unit tests — `backend/tests/unit/services/test_auth_service_login.py`

```python
import pytest
from app.services import auth_service
from app.models.user import User
from app.extensions import db


def _register(db_session, email='login@svc.com'):
    auth_service.register_user(
        email=email, password='password123', first_name='L', last_name='U'
    )


def test_login_user_returns_user_dict(db_session):
    _register(db_session)
    result = auth_service.login_user(email='login@svc.com', password='password123')
    assert result['email'] == 'login@svc.com'
    assert result['role'] == 'student'
    assert isinstance(result['id'], int)


def test_login_user_wrong_password_raises(db_session):
    _register(db_session)
    with pytest.raises(ValueError, match='Invalid credentials'):
        auth_service.login_user(email='login@svc.com', password='wrongpassword')


def test_login_user_unknown_email_raises(db_session):
    with pytest.raises(ValueError, match='Invalid credentials'):
        auth_service.login_user(email='nobody@svc.com', password='password123')


def test_login_user_inactive_raises(db_session):
    _register(db_session, email='inactive@svc.com')
    user = db_session.query(User).filter_by(email='inactive@svc.com').first()
    user.is_active = False
    db_session.commit()
    with pytest.raises(ValueError, match='Invalid credentials'):
        auth_service.login_user(email='inactive@svc.com', password='password123')


def test_login_error_message_is_generic_for_all_failures(db_session):
    _register(db_session, email='gen@svc.com')
    errors = []
    for call in [
        lambda: auth_service.login_user('gen@svc.com', 'wrongpw'),
        lambda: auth_service.login_user('nobody@svc.com', 'password123'),
    ]:
        try:
            call()
        except ValueError as e:
            errors.append(str(e))
    assert len(set(errors)) == 1, 'All failure paths must return the same error message'


def test_login_user_role_returned_correctly(db_session):
    _register(db_session, email='role@svc.com')
    result = auth_service.login_user(email='role@svc.com', password='password123')
    assert result['role'] == 'student'
```

### Task 6: Run full test suite

```bash
cd backend
python -m pytest tests/ -v --tb=short
```

All 51 existing tests + all new login tests must pass.

---

## Architecture Compliance

### Anti-Patterns — DO NOT Do These

```python
# ❌ Reveal which field failed
if not user:
    return 'Email not found', 404  # user enumeration
if not password_matches:
    return 'Wrong password', 401  # reveals account exists

# ✅ Generic response for all auth failures
raise ValueError('Invalid credentials')
```

```python
# ❌ No timing attack mitigation
user = User.query.filter_by(email=email).first()
if not user:
    raise ValueError('Invalid credentials')  # fast path leaks timing info

# ✅ Always bcrypt compare (constant time)
stored_hash = user.password_hash if user else DUMMY_HASH
bcrypt.checkpw(password.encode(), stored_hash.encode())
```

```python
# ❌ Reinvent token issuance
access_token = create_access_token(identity=str(user.id))
response.set_cookie('refresh_token', refresh_token, httponly=True)

# ✅ Use jwt_service.attach_tokens() — already handles all cookie config
response, access_token = jwt_service.attach_tokens(response, user)
```

```python
# ❌ Login response structure matching register (flat data)
return {'data': {'id': 1, 'email': '...', 'role': '...', 'access_token': '...'}}

# ✅ Login nests user under 'user' key per AC1
return {'data': {'access_token': '...', 'user': {'id': 1, 'email': '...', 'role': '...'}}}
```

---

## Previous Story Intelligence (from Story 2.1)

- `bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))` — exact pattern for verification
- `jwt_service.attach_tokens(response, user)` — returns `(response, access_token)`; refresh cookie is set automatically from `JWT_REFRESH_COOKIE_PATH` in config
- `_flatten_messages(err.messages)` helper already in routes.py — reuse it for ValidationError
- `make_response(jsonify({...}), 200)` then `response.data = jsonify({...}).data` — established pattern for setting cookie + body together
- `db.session.get(User, result['id'])` — correct SQLAlchemy 2.x way to fetch by PK after service returns id
- `db_client` fixture creates fresh SQLite in-memory DB per test — each test must register its own user
- `db_session` fixture for unit tests — commits work correctly against the same in-memory DB
- `limiter` is backed by `memory://` in `TestingConfig` — rate limit decorator won't block tests unless limit is hit within a single test
- `RegisterSchema` uses `unknown = EXCLUDE` — `LoginSchema` must do the same

---

## Dev Notes

### Testing mandate (effective from Story 2.2)
Every code change must have corresponding unit and integration tests. All tests must pass before moving on.

### `DUMMY_HASH` constant
Place at module level in `auth_service.py`, not inside the function. The bcrypt dummy comparison is the industry standard pattern — do not skip it even though it adds ~100ms latency on unknown-email attempts.

### `is_active` check ordering
Check `not user or not password_matches or not user.is_active` — this order ensures the bcrypt compare always runs (timing safety) before the is_active gate.

### Rate limit: 20/min for login
Architecture specifies 20 req/min on auth endpoints (double the register limit). This allows legitimate users with password managers to retry without hitting limits, while still throttling brute force.

### `User.roles` is a dynamic relationship
`next(iter(user.roles), None)` is the safe way to get the first role without calling `.all()`.

### No email case-normalization (deferred)
Story 2.1 deferred email normalization. Login must behave consistently with registration — if `User@Example.com` was registered, only `User@Example.com` can log in. Do not add normalization here without a story for it.

---

## Implementation Tasks (Status)

- [x] Task 1: Add `LoginSchema` to `app/api/v1/auth/schemas.py`
- [x] Task 2: Add `login_user()` to `app/services/auth_service.py`
- [x] Task 3: Add `POST /login` to `app/api/v1/auth/routes.py`
- [x] Task 4: Write integration tests — `tests/integration/test_auth_login.py`
- [x] Task 5: Write unit tests — `tests/unit/services/test_auth_service_login.py`
- [x] Task 6: Run full test suite — 92/92 pass

## Dev Agent Record

| Date | Agent | Action |
|---|---|---|
| 2026-04-19 | claude-sonnet-4-6 | Implemented all 6 tasks; 92/92 tests pass |

### Completion Notes

- `_DUMMY_HASH` generated at module load with `bcrypt.hashpw` — ensures valid hash format for timing-safe comparison
- `LoginSchema` has no password length validation — login must accept any credential string
- `login_user()` always runs bcrypt compare regardless of email existence — prevents timing-based user enumeration
- `not user or not password_matches or not user.is_active` ordering ensures bcrypt always runs before is_active gate
- Response nests user under `"user"` key distinct from register's flat response

## File List

- `backend/app/api/v1/auth/schemas.py` — added `LoginSchema`
- `backend/app/services/auth_service.py` — added `login_user()` + `_DUMMY_HASH` sentinel
- `backend/app/api/v1/auth/routes.py` — added `POST /login` route
- `backend/tests/integration/test_auth_login.py` — 15 integration tests (all ACs)
- `backend/tests/unit/services/test_auth_service_login.py` — 6 unit tests for `login_user()`

## Change Log

| Date | Change |
|---|---|
| 2026-04-19 | Implemented `POST /api/v1/auth/login` — schema, service, route, tests (92/92 pass) |

## Status

- **Status:** review
- **Created:** 2026-04-19
- **Completed:** 2026-04-19
