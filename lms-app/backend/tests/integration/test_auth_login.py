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
    assert data['data']['access_token'].count('.') == 2


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
    assert data['code'] == 'UNAUTHORIZED'
    assert data['message'] == 'Invalid credentials'


def test_login_unknown_email_returns_401(db_client):
    resp = db_client.post('/api/v1/auth/login', json={
        'email': 'nobody@example.com', 'password': 'password123',
    })
    assert resp.status_code == 401
    data = json.loads(resp.data)
    assert data['code'] == 'UNAUTHORIZED'


def test_login_error_does_not_reveal_which_field_failed(db_client):
    _register(db_client)
    wrong_pw = db_client.post('/api/v1/auth/login', json={
        'email': VALID_USER['email'], 'password': 'wrongpassword',
    })
    unknown_email = db_client.post('/api/v1/auth/login', json={
        'email': 'nobody@example.com', 'password': 'password123',
    })
    assert (json.loads(wrong_pw.data)['message'] ==
            json.loads(unknown_email.data)['message'])


def test_login_missing_email_returns_422(db_client):
    resp = db_client.post('/api/v1/auth/login', json={'password': 'password123'})
    assert resp.status_code == 422
    data = json.loads(resp.data)
    assert data['code'] == 'VALIDATION_ERROR'


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
    assert 'success' in body


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
