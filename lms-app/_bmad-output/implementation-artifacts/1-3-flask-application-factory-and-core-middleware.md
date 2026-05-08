# Story 1.3: Flask Application Factory and Core Middleware

## Story Metadata

| Field | Value |
|---|---|
| **Story ID** | 1.3 |
| **Story Key** | 1-3-flask-application-factory-and-core-middleware |
| **Epic** | Epic 1: Project Foundation & Development Environment |
| **Status** | done |
| **Date Created** | 2026-04-19 |

---

## User Story

**As a** developer,
**I want** the Flask app to use the Application Factory pattern with all core middleware registered,
**So that** the API has consistent error handling, logging, CORS, rate limiting, and JWT support from day one.

---

## Acceptance Criteria

**Given** the Flask app is started
**When** any request is received
**Then** structured JSON logs are emitted to stdout in the format:
`{"timestamp": "...", "method": "...", "path": "...", "status": ..., "duration_ms": ...}`

**Given** an unhandled exception occurs in any route
**When** the error propagates to the handler
**Then** the response follows RFC 7807 format:
`{"data": null, "meta": null, "error": {"type": "INTERNAL_ERROR", "title": "...", "detail": "...", "status": 500}}`

**Given** a request comes from an unapproved origin in staging/prod
**When** CORS headers are checked
**Then** the request is rejected (CORS headers absent / 403)

**Given** `app/config.py` exists
**When** `APP_ENV=development|staging|production` environment variable is set
**Then** the correct config class (`DevelopmentConfig`, `StagingConfig`, `ProductionConfig`) is loaded

**Given** `app/extensions.py` exists
**When** `create_app()` is called
**Then** SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-CORS, and Flask-Limiter are all initialized on the app instance

---

## Technical Context & Architecture Guardrails

### What Already Exists (Do NOT Recreate)

From Stories 1.1 + 1.2 + code review patches — all of this is in place:

| File | Current State |
|---|---|
| `backend/app/__init__.py` | `create_app()` factory — extensions initialized, CORS logic with comma-separated origins, health route |
| `backend/app/config.py` | `DevelopmentConfig`, `StagingConfig` (with `CORS_ORIGINS`), `ProductionConfig` (with `CORS_ORIGINS`) |
| `backend/app/extensions.py` | `db`, `migrate`, `jwt`, `cors`, `limiter` module-level objects |
| `backend/app/middleware/error_handlers.py` | Stub: `# Stub — implemented in Story 1.3` |
| `backend/app/middleware/request_logger.py` | Stub: `# Stub — implemented in Story 1.3` |
| `backend/app/middleware/auth_middleware.py` | Stub — **NOT touched in this story** (JWT auth is Story 2.x) |
| `backend/app/middleware/rbac.py` | Stub — **NOT touched in this story** (RBAC is Story 2.4) |
| `backend/tests/conftest.py` | `app` and `client` fixtures |
| `backend/tests/integration/test_health.py` | 3 passing health endpoint tests |

### What This Story Implements

Story 1.3 fills in exactly **3 stubs** and updates **2 existing files**:

1. `backend/app/middleware/request_logger.py` — structured JSON request logging
2. `backend/app/middleware/error_handlers.py` — RFC 7807 centralized error handling
3. `backend/app/config.py` — add `RATELIMIT_STORAGE_URI` + `RATELIMIT_DEFAULT_LIMITS` to all config classes
4. `backend/app/__init__.py` — register logger + error handlers; wire Limiter storage via config
5. `backend/tests/` — tests for logging output and error formats

### Architecture Requirements (Non-Negotiable)

**Error response envelope (must match exactly across all endpoints):**
```json
{
  "data": null,
  "meta": null,
  "error": {
    "type": "INTERNAL_ERROR",
    "title": "Internal Server Error",
    "detail": "A description of what went wrong",
    "status": 500
  }
}
```

**Request log format (must match exactly for CloudWatch parsing):**
```json
{
  "timestamp": "2026-04-19T10:00:00.000Z",
  "method": "GET",
  "path": "/api/v1/health",
  "status": 200,
  "duration_ms": 12.5
}
```

**Rate limiting (architecture-mandated):**
- 100 req/min per IP globally (all routes)
- 20 req/min per IP on auth endpoints — applied in Story 2.x blueprints via `@limiter.limit("20 per minute")`
- Storage: Redis in Docker/staging/prod, memory fallback in bare-local dev

**CORS (already wired, do not change the logic):**
- Development: defaults to `*` (no `CORS_ORIGINS` in dev config)
- Staging/prod: reads `CORS_ORIGINS` env var (comma-separated); empty = block all

**Flask-Limiter 3.x config keys (read by `limiter.init_app(app)` from Flask app config):**
- `RATELIMIT_STORAGE_URI` — e.g. `redis://redis:6379/0` or `memory://`
- `RATELIMIT_DEFAULT_LIMITS` — list of strings, e.g. `["100 per minute"]`

---

## Implementation Tasks

- [x] Task 1: Add Rate-Limit Config to `backend/app/config.py`
- [x] Task 2: Implement `backend/app/middleware/request_logger.py`
- [x] Task 3: Implement `backend/app/middleware/error_handlers.py`
- [x] Task 4: Update `backend/app/__init__.py`
- [x] Task 5: Write Tests

### Task 1: Add Rate-Limit Config to `backend/app/config.py`

Add to the **base `Config` class** (inherited by all environments):

```python
RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL', 'memory://')
RATELIMIT_DEFAULT_LIMITS = ['100 per minute']
```

Override in `StagingConfig` and `ProductionConfig` to require Redis (no memory fallback):

```python
class StagingConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL')  # must be set; None = startup error

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL')  # must be set; None = startup error
```

`DevelopmentConfig` inherits from base Config — uses `REDIS_URL` if set (Docker), `memory://` if not (bare local dev). Do NOT override `RATELIMIT_STORAGE_URI` in `DevelopmentConfig`.

### Task 2: Implement `backend/app/middleware/request_logger.py`

Replace the stub entirely. The module exposes a single `register_request_logger(app)` function called from `create_app()`.

```python
import time
import json
import logging
from datetime import datetime, timezone
from flask import request, g

logger = logging.getLogger(__name__)


def register_request_logger(app):
    @app.before_request
    def _start_timer():
        g.start_time = time.time()

    @app.after_request
    def _log_request(response):
        duration_ms = round((time.time() - getattr(g, 'start_time', time.time())) * 1000, 2)
        log_record = {
            'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.') +
                         f'{datetime.now(timezone.utc).microsecond // 1000:03d}Z',
            'method': request.method,
            'path': request.path,
            'status': response.status_code,
            'duration_ms': duration_ms,
        }
        app.logger.info(json.dumps(log_record))
        return response
```

**Critical notes:**
- `getattr(g, 'start_time', time.time())` guards against edge cases where `before_request` didn't run (e.g., middleware short-circuits).
- `app.logger.info(...)` — uses Flask's app logger (not `logger` directly) so log level and handlers are controlled by the app config.
- The `after_request` hook runs even for error responses (including from error handlers), so all requests are logged.
- Do NOT add `remote_addr`, `user_agent`, or other fields in this story — the spec defines exactly 5 fields.

### Task 3: Implement `backend/app/middleware/error_handlers.py`

Replace the stub entirely. Two handlers: one for Werkzeug `HTTPException` (known HTTP errors like 404, 405, 429) and one for all other exceptions.

```python
import logging
from flask import jsonify
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


def register_error_handlers(app):

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        error_type = e.name.upper().replace(' ', '_').replace('-', '_')
        return jsonify({
            'data': None,
            'meta': None,
            'error': {
                'type': error_type,
                'title': e.name,
                'detail': e.description,
                'status': e.code,
            }
        }), e.code

    @app.errorhandler(Exception)
    def handle_generic_exception(e):
        logger.exception('Unhandled exception: %s', str(e))
        detail = str(e) if app.debug else 'An unexpected error occurred'
        return jsonify({
            'data': None,
            'meta': None,
            'error': {
                'type': 'INTERNAL_ERROR',
                'title': 'Internal Server Error',
                'detail': detail,
                'status': 500,
            }
        }), 500
```

**Critical notes:**
- `HTTPException` handler must be registered first — Flask matches the most specific handler.
- In production (`app.debug = False`), generic exception `detail` is a safe string. In debug mode, the actual exception message is exposed (dev convenience).
- `logger.exception(...)` logs the full traceback to stderr. This is intentional — tracebacks go to logs, NOT the HTTP response.
- Do NOT import or use `abort()` in this module — the handlers respond to `abort()` calls made elsewhere.
- Flask-Limiter's `429 Too Many Requests` is an `HTTPException` — the `handle_http_exception` handler catches it automatically.

### Task 4: Update `backend/app/__init__.py`

Add imports and registration calls for the two new middleware modules. Wire the Limiter storage URI from config. The logging level should be set from config.

**Complete updated `backend/app/__init__.py`:**

```python
import logging
import os
from flask import Flask
from .config import config_map
from .extensions import db, migrate, jwt, cors, limiter
from .middleware.request_logger import register_request_logger
from .middleware.error_handlers import register_error_handlers


def create_app(config_name: str = None) -> Flask:
    app = Flask(__name__)

    env = config_name or os.environ.get('APP_ENV', 'development')
    app.config.from_object(config_map[env])

    # Configure Python logging level from Flask DEBUG flag
    logging.basicConfig(
        level=logging.DEBUG if app.config.get('DEBUG') else logging.INFO,
        format='%(message)s',
    )

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    raw_origins = app.config.get('CORS_ORIGINS', '*')
    cors_origins = [o.strip() for o in raw_origins.split(',') if o.strip()] if raw_origins != '*' else '*'
    cors.init_app(app, resources={r'/api/*': {'origins': cors_origins}})

    limiter.init_app(app)  # reads RATELIMIT_STORAGE_URI + RATELIMIT_DEFAULT_LIMITS from app.config

    # Register middleware
    register_request_logger(app)
    register_error_handlers(app)

    # Health check — registered directly (not in a blueprint) so it's always available
    # for ECS/ALB health checks even before full API wiring
    @app.route('/api/v1/health')
    def health():
        return {'data': {'status': 'ok'}, 'meta': None, 'error': None}, 200

    # Blueprints registered here as each story is implemented
    # from .api.v1 import register_blueprints
    # register_blueprints(app)

    return app
```

**Critical notes:**
- `logging.basicConfig(format='%(message)s')` — strips the default `INFO:root:` prefix so only the raw JSON string is emitted. This keeps CloudWatch parsing clean.
- `limiter.init_app(app)` reads `RATELIMIT_STORAGE_URI` from `app.config` automatically — no manual URI passing needed.
- `register_request_logger(app)` must be called BEFORE `register_error_handlers(app)` so the after_request log fires after error handlers produce their response.
- The health endpoint stays registered directly on the app — never move it to a Blueprint.

### Task 5: Write Tests

**`backend/tests/integration/test_middleware.py`** — test error handlers and logging:

```python
import json
import pytest


def test_404_returns_rfc7807(client):
    response = client.get('/api/v1/nonexistent')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data['data'] is None
    assert data['meta'] is None
    assert data['error']['type'] == 'NOT_FOUND'
    assert data['error']['status'] == 404
    assert 'title' in data['error']
    assert 'detail' in data['error']


def test_generic_exception_returns_500(app, client):
    @app.route('/api/v1/test-error')
    def trigger_error():
        raise RuntimeError('deliberate test error')

    response = client.get('/api/v1/test-error')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert data['data'] is None
    assert data['error']['type'] == 'INTERNAL_ERROR'
    assert data['error']['status'] == 500


def test_500_detail_hidden_in_production(client, app):
    app.config['DEBUG'] = False

    @app.route('/api/v1/test-prod-error')
    def trigger_prod_error():
        raise RuntimeError('secret internal message')

    response = client.get('/api/v1/test-prod-error')
    data = json.loads(response.data)
    assert 'secret internal message' not in data['error']['detail']


def test_request_log_emitted(client, caplog):
    import logging
    with caplog.at_level(logging.INFO):
        client.get('/api/v1/health')

    log_messages = [r.message for r in caplog.records]
    assert any('"method"' in msg and '"path"' in msg for msg in log_messages), \
        'Expected JSON log with method and path fields'


def test_health_still_passes(client):
    response = client.get('/api/v1/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data == {'data': {'status': 'ok'}, 'meta': None, 'error': None}
```

**Notes on tests:**
- `test_generic_exception_returns_500` registers a route on the `app` fixture. Each test gets a fresh app from the fixture in `conftest.py` so no route pollution between tests.
- `test_500_detail_hidden_in_production` sets `DEBUG=False` on the test app. In conftest, `DevelopmentConfig` has `DEBUG=True` by default.
- `caplog` is pytest's built-in log capture fixture — no extra dependencies needed.
- After adding these tests, run the full suite including the existing health tests to check for regressions.

---

## Architecture Compliance Checklist

Before marking this story done, verify:

- [ ] `register_request_logger(app)` and `register_error_handlers(app)` are called in `create_app()`
- [ ] Request logs are JSON strings with exactly: `timestamp`, `method`, `path`, `status`, `duration_ms`
- [ ] `GET /api/v1/health` still returns `{"data": {"status": "ok"}, "meta": null, "error": null}` with HTTP 200
- [ ] `GET /api/v1/nonexistent` returns RFC 7807 JSON with `status: 404` and `type: "NOT_FOUND"`
- [ ] Unhandled exception routes return `{"data": null, "meta": null, "error": {"type": "INTERNAL_ERROR", "status": 500, ...}}`
- [ ] `RATELIMIT_STORAGE_URI` is set in `Config` base (REDIS_URL or memory://) and overridden in Staging/Prod
- [ ] `RATELIMIT_DEFAULT_LIMITS = ["100 per minute"]` is set in base Config
- [ ] Flask-Limiter UserWarning about in-memory storage is GONE when `REDIS_URL` is set (Docker env)
- [ ] `logging.basicConfig(format='%(message)s')` ensures clean JSON-only stdout
- [ ] All existing tests still pass (no regressions)
- [ ] New middleware tests pass

---

## Anti-Patterns — Do NOT Do These

```python
# ❌ Do NOT return error responses directly from routes
@app.route('/api/v1/courses')
def get_courses():
    return jsonify({'error': 'not found'}), 404  # WRONG — bypasses error handler

# ✅ Always raise exceptions — error handler formats them
from werkzeug.exceptions import NotFound
raise NotFound('Course not found')
# OR use abort():
from flask import abort
abort(404, description='Course not found')
```

```python
# ❌ Do NOT add try/except in routes for generic errors — they bypass the global handler
@app.route('/api/v1/courses')
def get_courses():
    try:
        return course_service.get_all()
    except Exception as e:
        return jsonify({'error': str(e)}), 500  # WRONG — wrong format, bypasses handler

# ✅ Let exceptions propagate — the global handler in error_handlers.py catches them
@app.route('/api/v1/courses')
def get_courses():
    return course_service.get_all()
```

```python
# ❌ Do NOT log directly in routes — let the middleware handle request logging
@app.route('/api/v1/health')
def health():
    app.logger.info('health check called')  # WRONG — duplicate, non-structured log
    return ...

# ✅ request_logger.py logs ALL requests automatically via after_request hook
```

```python
# ❌ Do NOT change the error response envelope shape — other stories depend on it
return jsonify({'error': 'Not found', 'code': 404}), 404  # WRONG shape

# ✅ Always use the exact RFC 7807 envelope
return jsonify({
    'data': None,
    'meta': None,
    'error': {'type': '...', 'title': '...', 'detail': '...', 'status': ...}
}), status_code
```

---

## Known Dependencies

- **Depends on Story 1.1** — stub files must exist; `create_app()` factory must be in place.
- **Depends on Story 1.2** — Docker Compose Redis service must be running for Redis-backed rate limiting in Docker.
- **Story 1.4 depends on this** — DB schema migration runs in the same app context; error handlers must be in place.
- **Story 2.x depends on this** — Auth routes use `@limiter.limit("20 per minute")` decorator on top of the global 100/min default set here.

---

## Previous Story Intelligence

From Story 1.1:
- Flask-Limiter emits `UserWarning: Using the in-memory storage...` whenever Redis is unavailable. Fixing this is the primary deliverable of Task 1 in this story.
- `extensions.py` defines all extension objects at module level — they are bound to the app via `init_app()` in `create_app()`. Do not change this pattern.

From Story 1.2 dev notes:
- Flask-Limiter UserWarning was noted as expected in that story — explicitly deferred to THIS story for resolution.
- The `REDIS_URL` environment variable is already passed to the backend service in `docker-compose.yml` as `redis://redis:6379/0`.

From code review (applied to Story 1.1):
- `create_app()` already has the CORS comma-separated origins logic — do not change it.
- `CORS_ORIGINS` is now correctly set in `StagingConfig` and `ProductionConfig` — do not add it to base `Config`.

---

## Dev Notes

- `RATELIMIT_STORAGE_URI` added to base Config with `memory://` fallback; overridden in StagingConfig and ProductionConfig to require Redis (no fallback) — eliminates Flask-Limiter UserWarning in Docker where `REDIS_URL` is set.
- `register_request_logger(app)` registered before `register_error_handlers(app)` — ensures `after_request` log fires after error handlers produce their response.
- `logging.basicConfig(format='%(message)s')` strips the default `INFO:root:` prefix so only raw JSON reaches stdout.
- `caplog.at_level(logging.INFO)` in `test_request_log_emitted` captures Flask app logger output; test asserts on `"method"` and `"path"` keys in any log record.
- `test_500_detail_hidden_in_production` toggles `app.config['DEBUG'] = False` per-test; debug mode is restored by fixture teardown since each test gets a fresh app.

---

## Dev Agent Record

### Implementation Notes

- Added `RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL', 'memory://')` and `RATELIMIT_DEFAULT_LIMITS = ['100 per minute']` to base `Config`; added `RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL')` (no fallback) to `StagingConfig` and `ProductionConfig`.
- Implemented `register_request_logger(app)` in `request_logger.py` with `before_request` timer and `after_request` structured JSON log emitted via `app.logger.info()`.
- Implemented `register_error_handlers(app)` in `error_handlers.py` with `HTTPException` handler (RFC 7807 shape) and generic `Exception` handler (INTERNAL_ERROR, detail hidden in prod).
- Updated `__init__.py`: added `logging.basicConfig`, imported and called both middleware registration functions after `limiter.init_app(app)`.
- Created `backend/tests/integration/test_middleware.py` with 5 tests: 404 RFC7807, generic 500, prod detail hiding, request log emission via caplog, health regression.
- Full suite: **8/8 passed** (3 existing health tests + 5 new middleware tests), zero regressions.

### File List

**Modified:**
- `backend/app/config.py` — added `RATELIMIT_STORAGE_URI` + `RATELIMIT_DEFAULT_LIMITS` to base Config; `RATELIMIT_STORAGE_URI` override in StagingConfig and ProductionConfig
- `backend/app/__init__.py` — added `logging.basicConfig`, imported and registered request_logger and error_handlers middleware
- `backend/app/middleware/request_logger.py` — replaced stub with full implementation
- `backend/app/middleware/error_handlers.py` — replaced stub with full implementation

**Created:**
- `backend/tests/integration/test_middleware.py` — 5 integration tests for error handlers and request logging

### Change Log

- 2026-04-19: Story 1.3 implemented — rate-limit config, request logger, error handlers, middleware wiring in create_app(), 5 new integration tests passing 8/8.

### Review Findings

- [x] [Review][Patch] None RATELIMIT_STORAGE_URI in staging/prod silently falls back to memory — add explicit startup validation in create_app [backend/app/__init__.py + backend/app/config.py]
- [x] [Review][Patch] request_logger uses time.time() (non-monotonic) + zero-duration fallback misleads operators — switch to time.perf_counter() and use 0.0 as fallback [backend/app/middleware/request_logger.py:13,17]
- [x] [Review][Patch] Timestamp string formatting is hand-rolled — use strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3]+'Z' instead [backend/app/middleware/request_logger.py:20-21]
- [x] [Review][Patch] test_generic_exception_returns_500 missing title/detail envelope assertions [backend/tests/integration/test_middleware.py:26]
- [x] [Review][Defer] logging.basicConfig inside create_app is no-op after first call in a process [backend/app/__init__.py:16] — deferred, mandated by spec for CloudWatch clean stdout
- [x] [Review][Defer] format='%(message)s' strips level/name metadata from third-party logs [backend/app/__init__.py:19] — deferred, intentional per spec
- [x] [Review][Defer] json.dumps failure in after_request could swallow the response [backend/app/middleware/request_logger.py:26] — deferred, theoretical; Flask string attrs are always serializable
- [x] [Review][Defer] AC3 CORS rejection has no integration test coverage — deferred, CORS logic unchanged from Story 1.2; proper origin-header test setup is out of Story 1.3 scope

---

## Status

- **Status:** done
- **Created:** 2026-04-19
- **Completed:** 2026-04-19
