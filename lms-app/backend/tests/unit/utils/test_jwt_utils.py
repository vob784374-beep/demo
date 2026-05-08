"""
Edge case tests for app/utils/jwt_utils.py

Covers: blocklist round-trips, token inspection, is_token_valid boundaries.
All tests run inside app context provided by db_app fixture (no Redis — uses memory blocklist).
"""
import pytest
from flask_jwt_extended import create_access_token, create_refresh_token
from app.utils import jwt_utils


# ---------------------------------------------------------------------------
# JTI blocklist
# ---------------------------------------------------------------------------

def test_is_blocklisted_false_for_unknown_jti(db_app):
    assert jwt_utils.is_blocklisted('does-not-exist') is False


def test_add_then_is_blocklisted_true(db_app):
    jti = 'unit-test-jti-abc'
    jwt_utils.add_to_blocklist(jti, ttl_seconds=300)
    assert jwt_utils.is_blocklisted(jti) is True


def test_blocklist_does_not_affect_other_jtis(db_app):
    jwt_utils.add_to_blocklist('only-this-one', ttl_seconds=300)
    assert jwt_utils.is_blocklisted('some-other-jti') is False


def test_add_same_jti_twice_is_idempotent(db_app):
    jti = 'duplicate-jti'
    jwt_utils.add_to_blocklist(jti, ttl_seconds=300)
    jwt_utils.add_to_blocklist(jti, ttl_seconds=300)
    assert jwt_utils.is_blocklisted(jti) is True


# ---------------------------------------------------------------------------
# Token inspection (no request context needed)
# ---------------------------------------------------------------------------

def test_extract_identity_returns_subject(db_app):
    token = create_access_token(identity='99')
    assert jwt_utils.extract_identity(token) == '99'


def test_extract_jti_returns_nonempty_string(db_app):
    token = create_access_token(identity='1')
    jti = jwt_utils.extract_jti(token)
    assert isinstance(jti, str) and len(jti) > 0


def test_two_tokens_have_different_jtis(db_app):
    t1 = create_access_token(identity='1')
    t2 = create_access_token(identity='1')
    assert jwt_utils.extract_jti(t1) != jwt_utils.extract_jti(t2)


def test_extract_role_claim_present(db_app):
    token = create_access_token(identity='1', additional_claims={'role': 'teacher'})
    assert jwt_utils.extract_role_claim(token) == 'teacher'


def test_extract_role_claim_defaults_to_student_when_absent(db_app):
    token = create_access_token(identity='1')
    assert jwt_utils.extract_role_claim(token) == 'student'


# ---------------------------------------------------------------------------
# is_token_valid
# ---------------------------------------------------------------------------

def test_is_token_valid_true_for_fresh_token(db_app):
    token = create_access_token(identity='1')
    assert jwt_utils.is_token_valid(token) is True


def test_is_token_valid_false_for_garbage(db_app):
    assert jwt_utils.is_token_valid('not.a.jwt') is False


def test_is_token_valid_false_for_empty_string(db_app):
    assert jwt_utils.is_token_valid('') is False


def test_is_token_valid_false_for_truncated_token(db_app):
    token = create_access_token(identity='1')
    assert jwt_utils.is_token_valid(token[:20]) is False


def test_refresh_token_is_also_valid(db_app):
    token = create_refresh_token(identity='1')
    assert jwt_utils.is_token_valid(token) is True
