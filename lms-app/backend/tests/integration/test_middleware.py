import json
import pytest


def test_404_returns_rfc7807(client):
    response = client.get('/api/v1/nonexistent')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert data['data'] is None
    assert data['meta'] is None
    assert data['code'] == 'NOT_FOUND'
    assert data['success'] is False
    assert 'message' in data


def test_generic_exception_returns_500(app, client):
    @app.route('/api/v1/test-error')
    def trigger_error():
        raise RuntimeError('deliberate test error')

    response = client.get('/api/v1/test-error')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert data['data'] is None
    assert data['code'] == 'INTERNAL_ERROR'
    assert data['success'] is False
    assert 'message' in data


def test_500_detail_hidden_in_production(app, client):
    app.config['DEBUG'] = False

    @app.route('/api/v1/test-prod-error')
    def trigger_prod_error():
        raise RuntimeError('secret internal message')

    response = client.get('/api/v1/test-prod-error')
    data = json.loads(response.data)
    assert 'secret internal message' not in data['message']


def test_request_log_emitted(client):
    from structlog.testing import capture_logs
    with capture_logs() as cap_logs:
        client.get('/api/v1/health')

    assert any(
        log.get('method') is not None and log.get('path') is not None
        for log in cap_logs
    ), 'Expected structured log with method and path fields'


def test_health_still_passes(client):
    response = client.get('/api/v1/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['code'] == 'OK'
    assert data['data'] == {'status': 'ok'}
    assert data['meta'] is None
