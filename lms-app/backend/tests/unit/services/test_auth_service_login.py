import pytest
from app.services import auth_service
from app.models.user import User


def _register(db_session, email='login@svc.com'):
    auth_service.register_user(
        email=email, password='password123', first_name='L', last_name='U'
    )


def test_login_user_returns_user_dict(db_session):
    _register(db_session)
    result = auth_service.login_user(email='login@svc.com', password='password123')
    assert result['email'] == 'login@svc.com'
    assert result['role'] == 'student'
    assert isinstance(result['id'], int)


def test_login_user_wrong_password_raises(db_session):
    _register(db_session)
    with pytest.raises(ValueError, match='Invalid credentials'):
        auth_service.login_user(email='login@svc.com', password='wrongpassword')


def test_login_user_unknown_email_raises(db_session):
    with pytest.raises(ValueError, match='Invalid credentials'):
        auth_service.login_user(email='nobody@svc.com', password='password123')


def test_login_user_inactive_raises(db_session):
    _register(db_session, email='inactive@svc.com')
    user = db_session.query(User).filter_by(email='inactive@svc.com').first()
    user.is_active = False
    db_session.commit()
    with pytest.raises(ValueError, match='Invalid credentials'):
        auth_service.login_user(email='inactive@svc.com', password='password123')


def test_login_error_message_is_generic_for_all_failures(db_session):
    _register(db_session, email='gen@svc.com')
    errors = []
    for call in [
        lambda: auth_service.login_user('gen@svc.com', 'wrongpw'),
        lambda: auth_service.login_user('nobody@svc.com', 'password123'),
    ]:
        try:
            call()
        except ValueError as e:
            errors.append(str(e))
    assert len(set(errors)) == 1, 'All failure paths must return the same error message'


def test_login_user_role_returned_correctly(db_session):
    _register(db_session, email='role@svc.com')
    result = auth_service.login_user(email='role@svc.com', password='password123')
    assert result['role'] == 'student'
