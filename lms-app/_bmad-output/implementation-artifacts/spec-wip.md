---
title: 'Centralize API Response Construction'
type: 'refactor'
created: '2026-04-20'
status: 'draft'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Every Flask route and error handler manually constructs the `{data, meta, error}` envelope inline, duplicating ~8 lines per site across `auth/routes.py`, `rbac.py`, `error_handlers.py`, and `__init__.py`. As more routes are added this pattern will be copy-pasted project-wide, making the envelope shape hard to change and error types inconsistent.

**Approach:** Introduce `backend/app/utils/responses.py` with two primitives (`api_success`, `api_error`) and five error shortcuts. Refactor every existing call site — including `rbac.py` — to use them. No envelope shape or API contract change.

## Boundaries & Constraints

**Always:**
- Envelope shape `{data, meta, error}` and error shape `{type, title, detail, status}` stay identical — zero change to API contract.
- Helpers return plain `(Response, int)` tuples (Flask route return convention) so all existing route return statements work unchanged.
- All existing tests must pass unmodified after the refactor.
- New `responses.py` must have unit tests covering each helper and shortcut.

**Ask First:**
- Any proposal to change the envelope shape or field names.
- Any proposal to add middleware-level response wrapping (e.g. `after_request` transformation).

**Never:**
- Add response wrapping in `after_request` hook — breaks the `make_response` + cookie-setting flow in auth routes.
- Change HTTP status codes returned by any existing endpoint.
- Remove or rename any envelope field.
- Introduce a response class or object — keep it as plain dicts and `(Response, int)` tuples.

</frozen-after-approval>

## Code Map

- `backend/app/utils/responses.py` -- NEW: `api_success()`, `api_error()`, and five error shortcuts
- `backend/app/api/v1/auth/routes.py` -- REFACTOR: all inline envelopes replaced; `make_response` placeholder replaced by direct `api_success()` call
- `backend/app/middleware/rbac.py` -- REFACTOR: inline 403 envelope replaced with `forbidden()` shortcut
- `backend/app/middleware/error_handlers.py` -- REFACTOR: both handlers replaced with helpers
- `backend/app/__init__.py` -- REFACTOR: `_unauthorized_envelope` deleted; JWT loaders use `unauthorized` directly
- `backend/tests/unit/utils/test_responses.py` -- NEW: unit tests for all helpers and shortcuts

## Tasks & Acceptance

**Execution:**
- [ ] `backend/app/utils/responses.py` -- CREATE with `api_success(data, meta, status)`, `api_error(type_, title, detail, status)`, and shortcuts: `validation_error(detail)`, `unauthorized(detail)`, `forbidden(detail)`, `not_found(detail)`, `internal_error(detail)` -- single source of truth for envelope construction
- [ ] `backend/app/middleware/rbac.py` -- REFACTOR: replace inline 403 `jsonify({...})` dict with `forbidden('Insufficient role')`; import `forbidden` from `app.utils.responses`; remove `from flask import jsonify` import if no longer used
- [ ] `backend/app/middleware/error_handlers.py` -- REFACTOR: replace both inline `jsonify({...})` dicts in `handle_http_exception` and `handle_generic_exception` with `api_error(...)` calls; note that `handle_http_exception` derives `type` from `e.name` dynamically so it keeps calling `api_error` directly rather than a named shortcut
- [ ] `backend/app/api/v1/auth/routes.py` -- REFACTOR: (a) replace inline error `jsonify` dicts with `validation_error()` and `unauthorized()`; (b) replace the `make_response(jsonify({...}), status)` placeholder with `response, _ = api_success(status=status)` in `register`, `login`, `refresh`; (c) replace `response.data = jsonify({...}).data` body rewrites with `response.data = api_success(...)[0].data`; (d) replace `make_response(jsonify({...}), 200)` + return in `logout` with `response, _ = api_success()`
- [ ] `backend/app/__init__.py` -- REFACTOR: delete `_unauthorized_envelope`; replace `jwt.unauthorized_loader(_unauthorized_envelope)` with `jwt.unauthorized_loader(unauthorized)` and `jwt.invalid_token_loader(unauthorized)` (both match `(reason: str) → Response` signature); update `revoked_token_loader` lambda to call `unauthorized('Token has been revoked')` directly; import `unauthorized` from `app.utils.responses`; remove `from flask import jsonify as _jsonify`
- [ ] `backend/tests/unit/utils/test_responses.py` -- CREATE: unit tests for `api_success`, `api_error`, and each shortcut using `db_app` fixture (app context required for `jsonify`); assert correct HTTP status codes, correct envelope key presence, and correct error field values

**Acceptance Criteria:**
- Given any success helper call, when the response is inspected, then `data` holds the payload, `meta` is null, `error` is null.
- Given any error helper call, when the response is inspected, then `data` is null, `meta` is null, `error` contains matching `type`, `title`, `detail`, `status`.
- Given `pytest backend/tests/` runs after the refactor, when all tests complete, then zero tests fail — existing tests pass unmodified.
- Given `responses.py` is the only file that constructs the envelope dict, when the shape must change project-wide, then only one file needs editing.

## Spec Change Log

## Design Notes

**Primitives:**
```python
from flask import jsonify

def api_success(data=None, meta=None, status=200):
    return jsonify({'data': data, 'meta': meta, 'error': None}), status

def api_error(type_, title, detail, status):
    return jsonify({'data': None, 'meta': None, 'error': {
        'type': type_, 'title': title, 'detail': detail, 'status': status,
    }}), status

def validation_error(detail):    return api_error('VALIDATION_ERROR', 'Validation Error', detail, 422)
def unauthorized(detail='Unauthorized'): return api_error('UNAUTHORIZED', 'Unauthorized', detail, 401)
def forbidden(detail='Insufficient role'): return api_error('FORBIDDEN', 'Forbidden', detail, 403)
def not_found(detail='Resource not found'): return api_error('NOT_FOUND', 'Not Found', detail, 404)
def internal_error(detail='An unexpected error occurred'): return api_error('INTERNAL_ERROR', 'Internal Server Error', detail, 500)
```

**Cookie-setting routes** use a two-step pattern: create a response to attach cookies to, then overwrite the body. Replace `make_response(jsonify({...}), status)` with `api_success()` as the placeholder; use `[0].data` to extract bytes for the body rewrite:
```python
# register (before)
response = make_response(jsonify({'data': {**result, 'access_token': None}, 'meta': None, 'error': None}), 201)
response, access_token = jwt_service.attach_tokens(response, user)
response.data = jsonify({'data': {**result, 'access_token': access_token}, 'meta': None, 'error': None}).data

# register (after)
response, _ = api_success(status=201)
response, access_token = jwt_service.attach_tokens(response, user)
response.data = api_success({**result, 'access_token': access_token})[0].data
```

**JWT loaders in `__init__.py`** — `unauthorized_loader` and `invalid_token_loader` expect `(reason: str) → Response`. `unauthorized(detail)` satisfies this signature exactly:
```python
# before
jwt.unauthorized_loader(_unauthorized_envelope)
jwt.invalid_token_loader(_unauthorized_envelope)
jwt.revoked_token_loader(lambda _h, _p: _unauthorized_envelope('Token has been revoked'))

# after
jwt.unauthorized_loader(unauthorized)
jwt.invalid_token_loader(unauthorized)
jwt.revoked_token_loader(lambda _h, _p: unauthorized('Token has been revoked'))
```

## Verification

**Commands:**
- `cd backend && python -m pytest tests/unit/utils/test_responses.py -v` -- expected: all new tests pass
- `cd backend && python -m pytest tests/ -v` -- expected: zero regressions across all existing tests
