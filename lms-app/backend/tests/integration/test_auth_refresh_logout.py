import json

VALID_USER = {
    'email': 'refresh@example.com',
    'password': 'password123',
    'first_name': 'Refresh',
    'last_name': 'User',
}


def _register_and_login(db_client, payload=None):
    user = payload or VALID_USER
    reg = db_client.post('/api/v1/auth/register', json=user)
    assert reg.status_code == 201, f'Registration failed: {reg.data}'
    login = db_client.post('/api/v1/auth/login', json={
        'email': user['email'],
        'password': user['password'],
    })
    assert login.status_code == 200, f'Login failed: {login.data}'
    return login


# ── /refresh ────────────────────────────────────────────────────────────────

def test_refresh_success_returns_200(db_client):
    _register_and_login(db_client)
    resp = db_client.post('/api/v1/auth/refresh')
    assert resp.status_code == 200


def test_refresh_returns_new_access_token(db_client):
    login_resp = _register_and_login(db_client)
    original_token = json.loads(login_resp.data)['data']['access_token']
    resp = db_client.post('/api/v1/auth/refresh')
    data = json.loads(resp.data)
    assert 'access_token' in data['data']
    new_token = data['data']['access_token']
    assert new_token is not None
    assert new_token.count('.') == 2
    assert new_token != original_token, 'Rotated access token must differ from original'


def test_refresh_sets_new_refresh_cookie(db_client):
    _register_and_login(db_client)
    resp = db_client.post('/api/v1/auth/refresh')
    cookie = resp.headers.get('Set-Cookie', '')
    assert 'refresh_token_cookie' in cookie
    assert 'HttpOnly' in cookie


def test_refresh_returns_standard_envelope(db_client):
    _register_and_login(db_client)
    resp = db_client.post('/api/v1/auth/refresh')
    body = json.loads(resp.data)
    assert 'data' in body
    assert 'meta' in body
    assert 'success' in body
    assert body['success'] is True


def test_refresh_without_cookie_returns_401(db_client):
    resp = db_client.post('/api/v1/auth/refresh')
    assert resp.status_code == 401
    body = json.loads(resp.data)
    assert body['code'] == 'UNAUTHORIZED'
    assert 'data' in body and 'meta' in body


def test_refresh_token_rotation_blocks_old_token(db_client):
    """After rotating, the old refresh token JTI is blocklisted — replay must fail."""
    login_resp = _register_and_login(db_client)
    # Capture the original refresh cookie from all Set-Cookie headers
    old_token = None
    for header in login_resp.headers.getlist('Set-Cookie'):
        for part in header.split(';'):
            part = part.strip()
            if part.startswith('refresh_token_cookie='):
                old_token = part.split('=', 1)[1]
                break
        if old_token:
            break

    assert old_token, 'Login must set a refresh_token_cookie'

    # Rotate: first refresh consumes old token and issues a new one
    resp1 = db_client.post('/api/v1/auth/refresh')
    assert resp1.status_code == 200

    # Replay old token using a fresh client (no cookie jar interference) — JTI blocklisted → 401
    replay_client = db_client.application.test_client()
    replay_resp = replay_client.post(
        '/api/v1/auth/refresh',
        headers={'Cookie': f'refresh_token_cookie={old_token}'},
    )
    assert replay_resp.status_code == 401
    body = json.loads(replay_resp.data)
    assert body['code'] == 'UNAUTHORIZED'


def test_refresh_inactive_user_returns_401(db_client):
    from app.extensions import db as _db
    from app.models.user import User
    _register_and_login(db_client)
    with db_client.application.app_context():
        user = _db.session.query(User).filter_by(email=VALID_USER['email']).first()
        user.is_active = False
        _db.session.commit()
    resp = db_client.post('/api/v1/auth/refresh')
    assert resp.status_code == 401
    body = json.loads(resp.data)
    assert body['code'] == 'UNAUTHORIZED'
    assert body['data'] is None


# ── /logout ─────────────────────────────────────────────────────────────────

def test_logout_success_returns_200(db_client):
    _register_and_login(db_client)
    resp = db_client.post('/api/v1/auth/logout')
    assert resp.status_code == 200


def test_logout_clears_refresh_cookie(db_client):
    _register_and_login(db_client)
    resp = db_client.post('/api/v1/auth/logout')
    # unset_jwt_cookies emits multiple Set-Cookie headers; verify refresh cookie specifically
    cookies = resp.headers.getlist('Set-Cookie')
    refresh_cookies = [c for c in cookies if 'refresh_token_cookie' in c]
    assert refresh_cookies, 'refresh_token_cookie Set-Cookie header missing from logout response'
    cookie_str = ' '.join(refresh_cookies)
    assert 'Expires=Thu, 01 Jan 1970' in cookie_str or 'Max-Age=0' in cookie_str


def test_logout_returns_standard_envelope(db_client):
    _register_and_login(db_client)
    resp = db_client.post('/api/v1/auth/logout')
    body = json.loads(resp.data)
    assert body['data'] is None
    assert body['success'] is True


def test_logout_without_cookie_returns_401(db_client):
    resp = db_client.post('/api/v1/auth/logout')
    assert resp.status_code == 401
    body = json.loads(resp.data)
    assert body['code'] == 'UNAUTHORIZED'


def test_logout_token_cannot_refresh_after_logout(db_client):
    """After logout the refresh token JTI is blocklisted — refresh must fail."""
    _register_and_login(db_client)
    logout_resp = db_client.post('/api/v1/auth/logout')
    assert logout_resp.status_code == 200
    refresh_resp = db_client.post('/api/v1/auth/refresh')
    assert refresh_resp.status_code == 401
    body = json.loads(refresh_resp.data)
    assert body['code'] == 'UNAUTHORIZED'


def test_logout_idempotent_second_logout_fails(db_client):
    """Logging out twice: second logout has no valid cookie — 401."""
    _register_and_login(db_client)
    db_client.post('/api/v1/auth/logout')
    resp = db_client.post('/api/v1/auth/logout')
    assert resp.status_code == 401
