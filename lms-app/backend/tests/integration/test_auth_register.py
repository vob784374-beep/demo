import json


def test_register_success_returns_201(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'first_name': 'Test',
        'last_name': 'User',
    })
    assert resp.status_code == 201
    data = json.loads(resp.data)
    assert data['data']['email'] == 'test@example.com'
    assert data['data']['role'] == 'student'
    assert 'id' in data['data']
    assert data['meta'] is None
    assert data['success'] is True


def test_register_returns_access_token_in_body(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'token@example.com',
        'password': 'password123',
        'first_name': 'A',
        'last_name': 'B',
    })
    data = json.loads(resp.data)
    assert 'access_token' in data['data']
    assert data['data']['access_token'] is not None


def test_register_sets_refresh_cookie(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'cookie@example.com',
        'password': 'password123',
        'first_name': 'A',
        'last_name': 'B',
    })
    assert resp.status_code == 201
    cookie_header = resp.headers.get('Set-Cookie', '')
    assert 'refresh_token_cookie' in cookie_header
    assert 'HttpOnly' in cookie_header


def test_register_refresh_token_not_in_body(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'norefresh@example.com',
        'password': 'password123',
        'first_name': 'A',
        'last_name': 'B',
    })
    body = json.loads(resp.data)
    assert 'refresh_token' not in body['data']


def test_register_password_not_in_response(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'test2@example.com',
        'password': 'password123',
        'first_name': 'A',
        'last_name': 'B',
    })
    body = json.loads(resp.data)
    assert 'password' not in body['data']
    assert 'password_hash' not in body['data']


def test_register_duplicate_email_returns_422(db_client):
    payload = {
        'email': 'dup@example.com',
        'password': 'password123',
        'first_name': 'A',
        'last_name': 'B',
    }
    db_client.post('/api/v1/auth/register', json=payload)
    resp = db_client.post('/api/v1/auth/register', json=payload)
    assert resp.status_code == 422
    data = json.loads(resp.data)
    assert data['code'] == 'VALIDATION_ERROR'
    assert 'already registered' in data['message']


def test_register_missing_fields_returns_422(db_client):
    resp = db_client.post('/api/v1/auth/register', json={'email': 'x@x.com'})
    assert resp.status_code == 422
    data = json.loads(resp.data)
    assert data['code'] == 'VALIDATION_ERROR'


def test_register_short_password_returns_422(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'short@example.com',
        'password': 'abc',
        'first_name': 'A',
        'last_name': 'B',
    })
    assert resp.status_code == 422
    data = json.loads(resp.data)
    assert '8 characters' in str(data['message'])


def test_register_invalid_email_returns_422(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'notanemail',
        'password': 'password123',
        'first_name': 'A',
        'last_name': 'B',
    })
    assert resp.status_code == 422


def test_register_envelope_structure(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'envelope@example.com',
        'password': 'password123',
        'first_name': 'A',
        'last_name': 'B',
    })
    body = json.loads(resp.data)
    assert 'data' in body
    assert 'meta' in body
    assert 'success' in body
