"""
Integration tests for the logging and request-context infrastructure.

These tests use structlog.testing.capture_logs() which replaces the configured
processor chain with a passthrough that captures event dicts as plain Python
dicts — the most direct way to assert on structured log output.
"""
import json
import pytest
from structlog.testing import capture_logs


# ─── Request context: request_id, trace_id, X-Request-ID header ──────────────

def test_request_log_emitted_with_method_and_path(client):
    with capture_logs() as logs:
        client.get('/api/v1/health')

    access_logs = [l for l in logs if l.get('log_category') == 'access']
    assert access_logs, 'Expected at least one access log entry'
    entry = access_logs[0]
    assert entry['method'] == 'GET'
    assert entry['path'] == '/api/v1/health'
    assert entry['status'] == 200
    assert 'duration_ms' in entry


def test_response_includes_x_request_id_header(client):
    response = client.get('/api/v1/health')
    assert 'X-Request-ID' in response.headers
    rid = response.headers['X-Request-ID']
    assert len(rid) == 36  # UUID4 with hyphens


def test_response_includes_x_trace_id_header(client):
    response = client.get('/api/v1/health')
    assert 'X-Trace-ID' in response.headers
    tid = response.headers['X-Trace-ID']
    assert len(tid) == 32  # 32-hex UUID without hyphens


def test_x_request_id_header_propagated_from_client(client):
    custom_id = 'my-custom-request-id-abc123'
    response = client.get('/api/v1/health', headers={'X-Request-ID': custom_id})
    assert response.headers.get('X-Request-ID') == custom_id


def test_w3c_traceparent_propagated(client):
    trace_id = 'a' * 32
    traceparent = f'00-{trace_id}-b7ad6b7169203331-01'
    response = client.get('/api/v1/health', headers={'traceparent': traceparent})
    assert response.headers.get('X-Trace-ID') == trace_id


def test_b3_trace_id_propagated(client):
    b3_trace = 'b' * 32
    response = client.get('/api/v1/health', headers={'X-B3-TraceId': b3_trace})
    assert response.headers.get('X-Trace-ID') == b3_trace


def test_access_log_carries_request_id(client):
    with capture_logs() as logs:
        client.get('/api/v1/health')

    access_logs = [l for l in logs if l.get('log_category') == 'access']
    assert access_logs
    assert 'request_id' in access_logs[0]


def test_access_log_carries_trace_id(client):
    with capture_logs() as logs:
        client.get('/api/v1/health')

    access_logs = [l for l in logs if l.get('log_category') == 'access']
    assert access_logs
    assert 'trace_id' in access_logs[0]


# ─── Security logging ─────────────────────────────────────────────────────────

def _register_user(client, email='log_test@example.com', password='StrongPass1!'):
    return client.post('/api/v1/auth/register', json={
        'email': email,
        'first_name': 'Log',
        'last_name': 'Test',
        'password': password,
    })


def test_register_emits_security_log(db_client):
    with capture_logs() as logs:
        _register_user(db_client)

    sec_logs = [l for l in logs if l.get('log_category') == 'security']
    events = [l.get('event') for l in sec_logs]
    assert 'register_success' in events


def test_login_success_emits_security_log(db_client):
    _register_user(db_client)
    with capture_logs() as logs:
        db_client.post('/api/v1/auth/login', json={
            'email': 'log_test@example.com',
            'password': 'StrongPass1!',
        })

    sec_logs = [l for l in logs if l.get('log_category') == 'security']
    events = [l.get('event') for l in sec_logs]
    assert 'auth_success' in events


def test_login_failure_emits_security_log(db_client):
    _register_user(db_client)
    with capture_logs() as logs:
        db_client.post('/api/v1/auth/login', json={
            'email': 'log_test@example.com',
            'password': 'WrongPassword99',
        })

    sec_logs = [l for l in logs if l.get('log_category') == 'security']
    events = [l.get('event') for l in sec_logs]
    assert 'auth_failure' in events


def test_security_log_does_not_contain_full_email(db_client):
    _register_user(db_client, email='alice@secretcorp.com')
    with capture_logs() as logs:
        db_client.post('/api/v1/auth/login', json={
            'email': 'alice@secretcorp.com',
            'password': 'StrongPass1!',
        })

    sec_logs = [l for l in logs if l.get('log_category') == 'security']
    for entry in sec_logs:
        log_str = json.dumps(entry)
        assert 'alice@secretcorp.com' not in log_str, 'Full email must not appear in logs'
        if 'email_domain' in entry:
            assert entry['email_domain'] == 'secretcorp.com'


# ─── Sensitive field masking ──────────────────────────────────────────────────

def test_password_not_in_any_log(db_client):
    with capture_logs() as logs:
        _register_user(db_client, password='MySuperSecret99!')

    all_log_text = json.dumps(logs)
    assert 'MySuperSecret99!' not in all_log_text


# ─── Error logging ────────────────────────────────────────────────────────────

def test_unhandled_exception_emits_system_log(app, client):
    @app.route('/api/v1/test-logging-error')
    def _boom():
        raise RuntimeError('deliberate error for log test')

    with capture_logs() as logs:
        client.get('/api/v1/test-logging-error')

    system_logs = [l for l in logs if l.get('log_category') == 'system']
    assert system_logs, 'Expected system error log entry'
    assert system_logs[0].get('event') == 'unhandled_exception'
