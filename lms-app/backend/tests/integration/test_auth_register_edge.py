"""
Edge case and boundary integration tests for POST /api/v1/auth/register.

Covers: password byte boundaries, cookie contract, JWT shape, error format,
        input sanitization, and blocklist integration.
"""
import json
from app.utils import jwt_utils


# ---------------------------------------------------------------------------
# Password byte-length boundaries
# ---------------------------------------------------------------------------

def test_password_exactly_8_chars_passes(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'pw8@example.com', 'password': 'abcdefgh',
        'first_name': 'A', 'last_name': 'B',
    })
    assert resp.status_code == 201


def test_password_exactly_72_ascii_bytes_passes(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'pw72@example.com', 'password': 'a' * 72,
        'first_name': 'A', 'last_name': 'B',
    })
    assert resp.status_code == 201


def test_password_73_ascii_bytes_rejected(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'pw73@example.com', 'password': 'a' * 73,
        'first_name': 'A', 'last_name': 'B',
    })
    assert resp.status_code == 422
    data = json.loads(resp.data)
    assert '72' in data['message']


def test_password_72_utf8_bytes_multibyte_passes(db_client):
    # é = 2 bytes in UTF-8 → 36 × é = 72 bytes exactly — should pass
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'mb72@example.com', 'password': 'é' * 36,
        'first_name': 'A', 'last_name': 'B',
    })
    assert resp.status_code == 201


def test_password_74_utf8_bytes_multibyte_rejected(db_client):
    # 37 × é = 74 bytes — exceeds limit
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'mb74@example.com', 'password': 'é' * 37,
        'first_name': 'A', 'last_name': 'B',
    })
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Input edge cases
# ---------------------------------------------------------------------------

def test_blank_body_returns_422(db_client):
    resp = db_client.post('/api/v1/auth/register', json={})
    assert resp.status_code == 422
    data = json.loads(resp.data)
    assert data['code'] == 'VALIDATION_ERROR'


def test_null_field_values_returns_422(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': None, 'password': None,
        'first_name': None, 'last_name': None,
    })
    assert resp.status_code == 422


def test_non_json_content_type_returns_4xx(db_client):
    # Flask returns 415 Unsupported Media Type when content-type is not application/json
    resp = db_client.post(
        '/api/v1/auth/register',
        data='not json at all',
        content_type='text/plain',
    )
    assert resp.status_code in (415, 422)


def test_extra_fields_are_silently_ignored(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'extra@example.com', 'password': 'password123',
        'first_name': 'A', 'last_name': 'B',
        'role': 'admin', 'is_superuser': True, 'injected': 'payload',
    })
    assert resp.status_code == 201
    data = json.loads(resp.data)
    assert data['data']['role'] == 'student'
    assert 'injected' not in data['data']


def test_whitespace_only_email_rejected(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': '   ', 'password': 'password123',
        'first_name': 'A', 'last_name': 'B',
    })
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Response contract
# ---------------------------------------------------------------------------

def test_response_content_type_is_json(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'ct@example.com', 'password': 'password123',
        'first_name': 'A', 'last_name': 'B',
    })
    assert 'application/json' in resp.content_type


def test_access_token_is_three_segment_jwt(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'jwtshape@example.com', 'password': 'password123',
        'first_name': 'A', 'last_name': 'B',
    })
    data = json.loads(resp.data)
    token = data['data']['access_token']
    assert token.count('.') == 2


def test_error_detail_is_human_readable_string(db_client):
    # Should NOT be Python dict repr like "{'field': ['msg']}"
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'x@x.com', 'password': 'abc',
        'first_name': 'A', 'last_name': 'B',
    })
    detail = json.loads(resp.data)['message']
    assert isinstance(detail, str)
    assert not detail.startswith('{')
    assert not detail.startswith("{'")


def test_error_detail_for_multiple_missing_fields_lists_all(db_client):
    resp = db_client.post('/api/v1/auth/register', json={})
    detail = json.loads(resp.data)['message']
    # All four required fields should be mentioned
    assert 'email' in detail
    assert 'password' in detail
    assert 'first_name' in detail
    assert 'last_name' in detail


# ---------------------------------------------------------------------------
# Cookie contract
# ---------------------------------------------------------------------------

def test_refresh_cookie_is_httponly(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'cookie1@example.com', 'password': 'password123',
        'first_name': 'A', 'last_name': 'B',
    })
    cookie = resp.headers.get('Set-Cookie', '')
    assert 'HttpOnly' in cookie


def test_refresh_cookie_path_scoped_to_auth(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'cookie2@example.com', 'password': 'password123',
        'first_name': 'A', 'last_name': 'B',
    })
    cookie = resp.headers.get('Set-Cookie', '')
    assert '/api/v1/auth' in cookie


def test_error_response_does_not_set_cookie(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'bad', 'password': 'abc',
        'first_name': 'A', 'last_name': 'B',
    })
    assert resp.status_code == 422
    assert 'refresh_token_cookie' not in resp.headers.get('Set-Cookie', '')


# ---------------------------------------------------------------------------
# Blocklist integration
# ---------------------------------------------------------------------------

def test_blocklisted_jti_is_detected(db_client):
    resp = db_client.post('/api/v1/auth/register', json={
        'email': 'block@example.com', 'password': 'password123',
        'first_name': 'A', 'last_name': 'B',
    })
    access_token = json.loads(resp.data)['data']['access_token']
    jti = jwt_utils.extract_jti(access_token)

    assert jwt_utils.is_blocklisted(jti) is False
    jwt_utils.add_to_blocklist(jti, ttl_seconds=900)
    assert jwt_utils.is_blocklisted(jti) is True


def test_two_registrations_produce_independent_tokens(db_client):
    def register(email):
        r = db_client.post('/api/v1/auth/register', json={
            'email': email, 'password': 'password123',
            'first_name': 'A', 'last_name': 'B',
        })
        return json.loads(r.data)['data']['access_token']

    t1 = register('ind1@example.com')
    t2 = register('ind2@example.com')
    assert jwt_utils.extract_jti(t1) != jwt_utils.extract_jti(t2)
    assert jwt_utils.extract_identity(t1) != jwt_utils.extract_identity(t2)
