"""
Integration tests for auth_middleware.require_auth and rbac.require_role decorators.
Test routes are registered once per module on a shared db_app fixture.
"""
import json
import pytest


# ── User payloads ────────────────────────────────────────────────────────────

STUDENT_USER = {
    'email': 'student@rbac.com',
    'password': 'password123',
    'first_name': 'Student',
    'last_name': 'Rbac',
}

TEACHER_USER = {
    'email': 'teacher@rbac.com',
    'password': 'password123',
    'first_name': 'Teacher',
    'last_name': 'Rbac',
}

ADMIN_USER = {
    'email': 'admin@rbac.com',
    'password': 'password123',
    'first_name': 'Admin',
    'last_name': 'Rbac',
}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _register_and_login(client, payload):
    reg = client.post('/api/v1/auth/register', json=payload)
    assert reg.status_code == 201, f'Registration failed: {reg.data}'
    return _login(client, payload)


def _login(client, payload):
    login = client.post('/api/v1/auth/login', json={
        'email': payload['email'],
        'password': payload['password'],
    })
    assert login.status_code == 200, f'Login failed: {login.data}'
    token = json.loads(login.data)['data']['access_token']
    assert token is not None and token.count('.') == 2, f'Expected JWT, got: {token}'
    return token


def _set_user_role(app, email, role_name):
    """Update a user's role directly in the DB. Re-login after calling this."""
    from app.extensions import db as _db
    from app.models.user import User, Role, UserRole
    with app.app_context():
        user = _db.session.query(User).filter_by(email=email).first()
        role = _db.session.query(Role).filter_by(name=role_name).first()
        if not role:
            role = Role(name=role_name)
            _db.session.add(role)
            _db.session.flush()
        _db.session.query(UserRole).filter_by(user_id=user.id).delete()
        _db.session.add(UserRole(user_id=user.id, role_id=role.id))
        _db.session.commit()


def _auth_header(token):
    return {'Authorization': f'Bearer {token}'}


# ── Module-scoped fixture: registers test routes once ─────────────────────────

@pytest.fixture(scope='module')
def rbac_app():
    """Module-scoped app with test routes wired using the RBAC decorators."""
    from app import create_app
    from app.extensions import db as _db
    from app.middleware.auth_middleware import require_auth
    from app.middleware.rbac import require_role
    from app.utils.responses import success_response

    app = create_app('testing')

    @app.route('/test/require-auth', methods=['GET'])
    @require_auth
    def test_require_auth_route():
        return success_response('auth ok')

    @app.route('/test/teacher-only', methods=['GET'])
    @require_role('teacher')
    def test_teacher_only_route():
        return success_response('teacher ok')

    @app.route('/test/admin-only', methods=['GET'])
    @require_role('admin')
    def test_admin_only_route():
        return success_response('admin ok')

    @app.route('/test/teacher-or-admin', methods=['GET'])
    @require_role('teacher', 'admin')
    def test_teacher_or_admin_route():
        return success_response('multi ok')

    @app.route('/test/public', methods=['GET'])
    def test_public_route():
        return success_response('public')

    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture(scope='module')
def rbac_client(rbac_app):
    return rbac_app.test_client()


@pytest.fixture(scope='module')
def tokens(rbac_app, rbac_client):
    """Register all three users and return their access tokens."""
    student_token = _register_and_login(rbac_client, STUDENT_USER)

    _register_and_login(rbac_client, TEACHER_USER)
    _set_user_role(rbac_app, TEACHER_USER['email'], 'teacher')
    teacher_token = _login(rbac_client, TEACHER_USER)

    _register_and_login(rbac_client, ADMIN_USER)
    _set_user_role(rbac_app, ADMIN_USER['email'], 'admin')
    admin_token = _login(rbac_client, ADMIN_USER)

    return {
        'student': student_token,
        'teacher': teacher_token,
        'admin': admin_token,
    }


# ── require_auth tests ────────────────────────────────────────────────────────

def test_require_auth_no_token_returns_401(rbac_client):
    resp = rbac_client.get('/test/require-auth')
    assert resp.status_code == 401
    body = json.loads(resp.data)
    assert body['code'] == 'UNAUTHORIZED'
    assert body['data'] is None
    assert body['meta'] is None


def test_require_auth_valid_token_returns_200(rbac_client, tokens):
    resp = rbac_client.get('/test/require-auth', headers=_auth_header(tokens['student']))
    assert resp.status_code == 200
    body = json.loads(resp.data)
    assert body['data'] == 'auth ok'
    assert body['success'] is True


def test_require_auth_invalid_token_returns_401(rbac_client):
    resp = rbac_client.get('/test/require-auth', headers={'Authorization': 'Bearer notavalidtoken'})
    assert resp.status_code == 401
    body = json.loads(resp.data)
    assert body['code'] == 'UNAUTHORIZED'


def test_require_auth_rejects_refresh_token(rbac_client, tokens):
    """Refresh tokens (type='refresh') must be rejected on access-token-protected routes."""
    # Obtain a refresh token cookie by logging in and capturing the cookie
    from app.extensions import db as _db
    login_resp = rbac_client.post('/api/v1/auth/login', json={
        'email': STUDENT_USER['email'],
        'password': STUDENT_USER['password'],
    })
    assert login_resp.status_code == 200
    # Extract the raw refresh_token_cookie value from Set-Cookie headers
    refresh_token = None
    for header in login_resp.headers.getlist('Set-Cookie'):
        for part in header.split(';'):
            part = part.strip()
            if part.startswith('refresh_token_cookie='):
                refresh_token = part.split('=', 1)[1]
                break
        if refresh_token:
            break
    assert refresh_token, 'Login must set refresh_token_cookie'
    # Present the refresh token as a Bearer token — must be rejected (wrong token type)
    resp = rbac_client.get(
        '/test/require-auth',
        headers={'Authorization': f'Bearer {refresh_token}'},
    )
    assert resp.status_code == 401
    body = json.loads(resp.data)
    assert body['code'] == 'UNAUTHORIZED'


# ── require_role('teacher') tests ────────────────────────────────────────────

def test_teacher_route_no_token_returns_401(rbac_client):
    """No JWT → 401, not 403."""
    resp = rbac_client.get('/test/teacher-only')
    assert resp.status_code == 401
    body = json.loads(resp.data)
    assert body['code'] == 'UNAUTHORIZED'


def test_teacher_route_student_token_returns_403(rbac_client, tokens):
    resp = rbac_client.get('/test/teacher-only', headers=_auth_header(tokens['student']))
    assert resp.status_code == 403
    body = json.loads(resp.data)
    assert body['code'] == 'FORBIDDEN'
    assert body['message'] == 'Insufficient role'
    assert body['data'] is None
    assert body['meta'] is None


def test_teacher_route_teacher_token_returns_200(rbac_client, tokens):
    resp = rbac_client.get('/test/teacher-only', headers=_auth_header(tokens['teacher']))
    assert resp.status_code == 200
    body = json.loads(resp.data)
    assert body['data'] == 'teacher ok'
    assert body['success'] is True


def test_teacher_route_admin_token_returns_403(rbac_client, tokens):
    """Admin is NOT in ('teacher',) — must return 403."""
    resp = rbac_client.get('/test/teacher-only', headers=_auth_header(tokens['admin']))
    assert resp.status_code == 403
    body = json.loads(resp.data)
    assert body['code'] == 'FORBIDDEN'


# ── require_role('admin') tests ───────────────────────────────────────────────

def test_admin_route_no_token_returns_401(rbac_client):
    resp = rbac_client.get('/test/admin-only')
    assert resp.status_code == 401
    body = json.loads(resp.data)
    assert body['code'] == 'UNAUTHORIZED'


def test_admin_route_teacher_token_returns_403(rbac_client, tokens):
    resp = rbac_client.get('/test/admin-only', headers=_auth_header(tokens['teacher']))
    assert resp.status_code == 403
    body = json.loads(resp.data)
    assert body['code'] == 'FORBIDDEN'
    assert body['message'] == 'Insufficient role'


def test_admin_route_admin_token_returns_200(rbac_client, tokens):
    resp = rbac_client.get('/test/admin-only', headers=_auth_header(tokens['admin']))
    assert resp.status_code == 200
    body = json.loads(resp.data)
    assert body['data'] == 'admin ok'
    assert body['success'] is True


# ── require_role('teacher', 'admin') multi-role tests ────────────────────────

def test_multi_role_student_returns_403(rbac_client, tokens):
    resp = rbac_client.get('/test/teacher-or-admin', headers=_auth_header(tokens['student']))
    assert resp.status_code == 403
    body = json.loads(resp.data)
    assert body['code'] == 'FORBIDDEN'


def test_multi_role_teacher_returns_200(rbac_client, tokens):
    resp = rbac_client.get('/test/teacher-or-admin', headers=_auth_header(tokens['teacher']))
    assert resp.status_code == 200
    body = json.loads(resp.data)
    assert body['data'] == 'multi ok'


def test_multi_role_admin_returns_200(rbac_client, tokens):
    resp = rbac_client.get('/test/teacher-or-admin', headers=_auth_header(tokens['admin']))
    assert resp.status_code == 200
    body = json.loads(resp.data)
    assert body['data'] == 'multi ok'


# ── Public route test (no decorator) ─────────────────────────────────────────

def test_public_route_no_token_returns_200(rbac_client):
    """Public routes must not be affected by the JWT middleware."""
    resp = rbac_client.get('/test/public')
    assert resp.status_code == 200
    body = json.loads(resp.data)
    assert body['data'] == 'public'
    assert body['success'] is True


# ── Envelope consistency ──────────────────────────────────────────────────────

def test_401_envelope_has_standard_keys(rbac_client):
    resp = rbac_client.get('/test/require-auth')
    body = json.loads(resp.data)
    assert 'data' in body
    assert 'meta' in body
    assert 'success' in body
    assert 'code' in body
    assert 'message' in body


def test_403_envelope_has_standard_keys(rbac_client, tokens):
    resp = rbac_client.get('/test/teacher-only', headers=_auth_header(tokens['student']))
    body = json.loads(resp.data)
    assert 'data' in body
    assert 'meta' in body
    assert 'success' in body
    assert 'code' in body
    assert 'message' in body
