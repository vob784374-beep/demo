"""
Edge case tests for app/services/jwt_service.py

Covers: token structure, role claim embedding, identity encoding, revocation.
Uses db_session fixture (app context + SQLite in-memory).
"""
import pytest
from app.services import auth_service, jwt_service
from app.models.user import User
from app.utils import jwt_utils


def _register(db_session, email):
    auth_service.register_user(
        email=email, password='password123', first_name='T', last_name='T'
    )
    return db_session.query(User).filter_by(email=email).first()


# ---------------------------------------------------------------------------
# generate_tokens
# ---------------------------------------------------------------------------

def test_generate_tokens_returns_two_strings(db_session):
    user = _register(db_session, 'gen1@svc.com')
    access, refresh = jwt_service.generate_tokens(user)
    assert isinstance(access, str) and access.count('.') == 2
    assert isinstance(refresh, str) and refresh.count('.') == 2


def test_generate_tokens_access_encodes_user_id(db_session):
    user = _register(db_session, 'gen2@svc.com')
    access, _ = jwt_service.generate_tokens(user)
    assert jwt_utils.extract_identity(access) == str(user.id)


def test_generate_tokens_access_encodes_role(db_session):
    user = _register(db_session, 'gen3@svc.com')
    access, _ = jwt_service.generate_tokens(user)
    assert jwt_utils.extract_role_claim(access) == 'student'


def test_generate_tokens_access_and_refresh_have_different_jtis(db_session):
    user = _register(db_session, 'gen4@svc.com')
    access, refresh = jwt_service.generate_tokens(user)
    assert jwt_utils.extract_jti(access) != jwt_utils.extract_jti(refresh)


def test_generate_tokens_called_twice_produces_different_jtis(db_session):
    user = _register(db_session, 'gen5@svc.com')
    a1, _ = jwt_service.generate_tokens(user)
    a2, _ = jwt_service.generate_tokens(user)
    assert jwt_utils.extract_jti(a1) != jwt_utils.extract_jti(a2)


# ---------------------------------------------------------------------------
# revoke_current_token
# ---------------------------------------------------------------------------

def test_revoke_current_token_blocklists_jti(db_session):
    user = _register(db_session, 'rev1@svc.com')
    access, _ = jwt_service.generate_tokens(user)
    jti = jwt_utils.extract_jti(access)
    jwt_service.revoke_current_token(jti, ttl_seconds=900)
    assert jwt_utils.is_blocklisted(jti) is True


def test_revoke_does_not_affect_other_jtis(db_session):
    user = _register(db_session, 'rev2@svc.com')
    a1, _ = jwt_service.generate_tokens(user)
    a2, _ = jwt_service.generate_tokens(user)
    jti1 = jwt_utils.extract_jti(a1)
    jti2 = jwt_utils.extract_jti(a2)
    jwt_service.revoke_current_token(jti1, ttl_seconds=900)
    assert jwt_utils.is_blocklisted(jti2) is False


# ---------------------------------------------------------------------------
# _primary_role (via generate_tokens on user with no roles)
# ---------------------------------------------------------------------------

def test_generate_tokens_falls_back_to_student_when_no_roles(db_session):
    # Create a bare user with no roles attached
    from app.extensions import db
    from app.models.user import User
    import bcrypt
    pw = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode()
    user = User(email='norole@svc.com', password_hash=pw, first_name='N', last_name='R')
    db.session.add(user)
    db.session.commit()
    access, _ = jwt_service.generate_tokens(user)
    assert jwt_utils.extract_role_claim(access) == 'student'
