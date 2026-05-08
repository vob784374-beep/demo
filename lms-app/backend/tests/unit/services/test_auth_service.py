import bcrypt
import pytest
from app.services import auth_service
from app.models.user import User


def test_register_user_creates_user(db_session):
    result = auth_service.register_user(
        email='unit@example.com',
        password='password123',
        first_name='Unit',
        last_name='Test',
    )
    assert result['email'] == 'unit@example.com'
    assert result['role'] == 'student'
    assert isinstance(result['id'], int)


def test_register_user_hashes_password(db_session):
    auth_service.register_user(
        email='hash@example.com',
        password='mypassword',
        first_name='H',
        last_name='T',
    )
    user = db_session.query(User).filter_by(email='hash@example.com').first()
    assert user is not None
    assert user.password_hash != 'mypassword'
    assert bcrypt.checkpw(b'mypassword', user.password_hash.encode('utf-8'))


def test_register_user_duplicate_raises_value_error(db_session):
    auth_service.register_user(
        email='dup@example.com',
        password='password123',
        first_name='D',
        last_name='U',
    )
    with pytest.raises(ValueError, match='already registered'):
        auth_service.register_user(
            email='dup@example.com',
            password='password123',
            first_name='D',
            last_name='U',
        )


def test_register_user_creates_student_role(db_session):
    auth_service.register_user(
        email='role@example.com',
        password='password123',
        first_name='R',
        last_name='T',
    )
    user = db_session.query(User).filter_by(email='role@example.com').first()
    role_names = [r.name for r in user.roles]
    assert 'student' in role_names
