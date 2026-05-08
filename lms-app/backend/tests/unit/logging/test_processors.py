"""Unit tests for custom structlog processors."""
import pytest
from app.logging.processors import mask_sensitive_fields, add_service_context


# ─── mask_sensitive_fields ───────────────────────────────────────────────────

def _mask(event_dict: dict) -> dict:
    return mask_sensitive_fields(None, 'info', event_dict)


def test_mask_redacts_password():
    result = _mask({'event': 'login', 'password': 'hunter2'})
    assert result['password'] == '***REDACTED***'
    assert result['event'] == 'login'


def test_mask_redacts_access_token():
    result = _mask({'event': 'x', 'access_token': 'eyJhbGci...'})
    assert result['access_token'] == '***REDACTED***'


def test_mask_redacts_refresh_token():
    result = _mask({'event': 'x', 'refresh_token': 'rt_secret'})
    assert result['refresh_token'] == '***REDACTED***'


def test_mask_preserves_non_sensitive_fields():
    result = _mask({'event': 'login', 'user_id': '42', 'email_domain': 'example.com'})
    assert result['user_id'] == '42'
    assert result['email_domain'] == 'example.com'


def test_mask_recurses_into_nested_dict():
    result = _mask({'event': 'x', 'payload': {'password': 's3cr3t', 'name': 'Alice'}})
    assert result['payload']['password'] == '***REDACTED***'
    assert result['payload']['name'] == 'Alice'


def test_mask_recurses_into_list():
    result = _mask({'event': 'x', 'items': [{'password': 'pw'}, {'other': 'val'}]})
    assert result['items'][0]['password'] == '***REDACTED***'
    assert result['items'][1]['other'] == 'val'


def test_mask_handles_empty_dict():
    result = _mask({})
    assert result == {}


def test_mask_case_insensitive():
    result = _mask({'PASSWORD': 'secret', 'Access_Token': 'tok'})
    assert result['PASSWORD'] == '***REDACTED***'
    assert result['Access_Token'] == '***REDACTED***'


# ─── add_service_context ─────────────────────────────────────────────────────

def _svc(event_dict: dict) -> dict:
    proc = add_service_context('lms-api', 'testing')
    return proc(None, 'info', event_dict)


def test_add_service_context_injects_service():
    result = _svc({'event': 'x'})
    assert result['service'] == 'lms-api'


def test_add_service_context_injects_environment():
    result = _svc({'event': 'x'})
    assert result['environment'] == 'testing'


def test_add_service_context_does_not_overwrite_existing():
    result = _svc({'event': 'x', 'service': 'other-svc'})
    assert result['service'] == 'other-svc'


def test_add_service_context_different_env():
    proc = add_service_context('lms-api', 'production')
    result = proc(None, 'info', {'event': 'x'})
    assert result['environment'] == 'production'
