import json


def test_health_endpoint_returns_200(client):
    response = client.get('/api/v1/health')
    assert response.status_code == 200


def test_health_endpoint_returns_exact_json(client):
    response = client.get('/api/v1/health')
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['data'] == {'status': 'ok'}
    assert data['meta'] is None
    assert data['code'] == 'OK'


def test_health_endpoint_content_type_is_json(client):
    response = client.get('/api/v1/health')
    assert response.content_type == 'application/json'
