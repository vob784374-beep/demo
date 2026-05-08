import pytest
from app import create_app
from app.extensions import db as _db
from app.utils import jwt_utils


@pytest.fixture(autouse=True)
def clear_jwt_blocklist():
    jwt_utils._memory_blocklist.clear()
    yield
    jwt_utils._memory_blocklist.clear()


@pytest.fixture
def app():
    app = create_app('development')
    app.config['TESTING'] = True
    yield app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db_app():
    """App with SQLite in-memory DB — for model/schema tests only."""
    app = create_app('testing')
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture
def db_client(db_app):
    return db_app.test_client()


@pytest.fixture
def db_session(db_app):
    with db_app.app_context():
        yield _db.session
