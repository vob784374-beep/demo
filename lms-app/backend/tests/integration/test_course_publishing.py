"""
Integration tests for Story 3.2: Course Publishing Workflow
  POST /api/v1/courses/<id>/publish
  POST /api/v1/courses/<id>/unpublish
"""
import json
import pytest


# ── Fixtures & helpers ────────────────────────────────────────────────────────

TEACHER_A = {
    'email': 'ta_pub@courses.com',
    'password': 'SecurePass1!',
    'first_name': 'Alice',
    'last_name': 'Teacher',
}

TEACHER_B = {
    'email': 'tb_pub@courses.com',
    'password': 'SecurePass1!',
    'first_name': 'Bob',
    'last_name': 'Teacher',
}

STUDENT = {
    'email': 'student_pub@courses.com',
    'password': 'SecurePass1!',
    'first_name': 'Sam',
    'last_name': 'Student',
}


def _register(client, payload):
    resp = client.post('/api/v1/auth/register', json=payload)
    assert resp.status_code == 201, resp.data
    return resp


def _login(client, payload) -> str:
    resp = client.post('/api/v1/auth/login', json={
        'email': payload['email'],
        'password': payload['password'],
    })
    assert resp.status_code == 200, resp.data
    return json.loads(resp.data)['data']['access_token']


def _set_role(email, role_name):
    from app.extensions import db as _db
    from app.models.user import User, Role, UserRole
    user = _db.session.query(User).filter_by(email=email).first()
    role = _db.session.query(Role).filter_by(name=role_name).first()
    if not role:
        role = Role(name=role_name)
        _db.session.add(role)
        _db.session.flush()
    _db.session.query(UserRole).filter_by(user_id=user.id).delete()
    _db.session.add(UserRole(user_id=user.id, role_id=role.id))
    _db.session.commit()
    _db.session.expire_all()


def _auth(token: str) -> dict:
    return {'Authorization': f'Bearer {token}'}


def _create_course(client, token, title='Test Course') -> int:
    resp = client.post('/api/v1/courses', json={'title': title}, headers=_auth(token))
    assert resp.status_code == 201, resp.data
    return json.loads(resp.data)['data']['id']


def _add_lesson(db_app, course_id):
    from app.extensions import db as _db
    from app.models.lesson import Lesson
    with db_app.app_context():
        _db.session.add(Lesson(course_id=course_id, title='Lesson 1'))
        _db.session.commit()


@pytest.fixture
def setup(db_app, db_client):
    with db_app.app_context():
        _register(db_client, TEACHER_A)
        _set_role(TEACHER_A['email'], 'teacher')

        _register(db_client, TEACHER_B)
        _set_role(TEACHER_B['email'], 'teacher')

        _register(db_client, STUDENT)

    token_a = _login(db_client, TEACHER_A)
    token_b = _login(db_client, TEACHER_B)
    token_s = _login(db_client, STUDENT)

    return {'token_a': token_a, 'token_b': token_b, 'token_s': token_s}


# ── POST /api/v1/courses/<id>/publish ─────────────────────────────────────────

def test_publish_with_lesson_returns_200(setup, db_app, db_client):
    course_id = _create_course(db_client, setup['token_a'])
    _add_lesson(db_app, course_id)
    resp = db_client.post(f'/api/v1/courses/{course_id}/publish',
                          headers=_auth(setup['token_a']))
    assert resp.status_code == 200


def test_publish_sets_is_published_true(setup, db_app, db_client):
    course_id = _create_course(db_client, setup['token_a'])
    _add_lesson(db_app, course_id)
    resp = db_client.post(f'/api/v1/courses/{course_id}/publish',
                          headers=_auth(setup['token_a']))
    data = json.loads(resp.data)['data']
    assert data['is_published'] is True


def test_publish_returns_full_course_object(setup, db_app, db_client):
    course_id = _create_course(db_client, setup['token_a'], 'Publishable')
    _add_lesson(db_app, course_id)
    resp = db_client.post(f'/api/v1/courses/{course_id}/publish',
                          headers=_auth(setup['token_a']))
    data = json.loads(resp.data)['data']
    assert data['id'] == course_id
    assert data['title'] == 'Publishable'


def test_publish_without_lesson_returns_422(setup, db_client):
    course_id = _create_course(db_client, setup['token_a'], 'No Lessons')
    resp = db_client.post(f'/api/v1/courses/{course_id}/publish',
                          headers=_auth(setup['token_a']))
    assert resp.status_code == 422


def test_publish_without_lesson_returns_error_message(setup, db_client):
    course_id = _create_course(db_client, setup['token_a'])
    resp = db_client.post(f'/api/v1/courses/{course_id}/publish',
                          headers=_auth(setup['token_a']))
    body = json.loads(resp.data)
    assert 'at least one lesson' in body['message'].lower()


def test_publish_by_non_owner_returns_403(setup, db_app, db_client):
    course_id = _create_course(db_client, setup['token_a'])
    _add_lesson(db_app, course_id)
    resp = db_client.post(f'/api/v1/courses/{course_id}/publish',
                          headers=_auth(setup['token_b']))
    assert resp.status_code == 403


def test_publish_nonexistent_course_returns_404(setup, db_client):
    resp = db_client.post('/api/v1/courses/999999/publish',
                          headers=_auth(setup['token_a']))
    assert resp.status_code == 404


def test_publish_no_auth_returns_401(db_client):
    resp = db_client.post('/api/v1/courses/1/publish')
    assert resp.status_code == 401


def test_publish_student_returns_403(setup, db_client):
    resp = db_client.post('/api/v1/courses/1/publish',
                          headers=_auth(setup['token_s']))
    assert resp.status_code == 403


def test_publish_already_published_returns_200(setup, db_app, db_client):
    course_id = _create_course(db_client, setup['token_a'])
    _add_lesson(db_app, course_id)
    db_client.post(f'/api/v1/courses/{course_id}/publish', headers=_auth(setup['token_a']))
    resp = db_client.post(f'/api/v1/courses/{course_id}/publish',
                          headers=_auth(setup['token_a']))
    assert resp.status_code == 200
    assert json.loads(resp.data)['data']['is_published'] is True


# ── POST /api/v1/courses/<id>/unpublish ───────────────────────────────────────

def test_unpublish_published_course_returns_200(setup, db_app, db_client):
    course_id = _create_course(db_client, setup['token_a'])
    _add_lesson(db_app, course_id)
    db_client.post(f'/api/v1/courses/{course_id}/publish', headers=_auth(setup['token_a']))
    resp = db_client.post(f'/api/v1/courses/{course_id}/unpublish',
                          headers=_auth(setup['token_a']))
    assert resp.status_code == 200


def test_unpublish_sets_is_published_false(setup, db_app, db_client):
    course_id = _create_course(db_client, setup['token_a'])
    _add_lesson(db_app, course_id)
    db_client.post(f'/api/v1/courses/{course_id}/publish', headers=_auth(setup['token_a']))
    resp = db_client.post(f'/api/v1/courses/{course_id}/unpublish',
                          headers=_auth(setup['token_a']))
    assert json.loads(resp.data)['data']['is_published'] is False


def test_unpublish_by_non_owner_returns_403(setup, db_app, db_client):
    course_id = _create_course(db_client, setup['token_a'])
    _add_lesson(db_app, course_id)
    db_client.post(f'/api/v1/courses/{course_id}/publish', headers=_auth(setup['token_a']))
    resp = db_client.post(f'/api/v1/courses/{course_id}/unpublish',
                          headers=_auth(setup['token_b']))
    assert resp.status_code == 403


def test_unpublish_nonexistent_course_returns_404(setup, db_client):
    resp = db_client.post('/api/v1/courses/999999/unpublish',
                          headers=_auth(setup['token_a']))
    assert resp.status_code == 404


def test_unpublish_no_auth_returns_401(db_client):
    resp = db_client.post('/api/v1/courses/1/unpublish')
    assert resp.status_code == 401


def test_unpublish_already_unpublished_returns_200(setup, db_client):
    course_id = _create_course(db_client, setup['token_a'])
    resp = db_client.post(f'/api/v1/courses/{course_id}/unpublish',
                          headers=_auth(setup['token_a']))
    assert resp.status_code == 200
    assert json.loads(resp.data)['data']['is_published'] is False


def test_publish_then_unpublish_full_workflow(setup, db_app, db_client):
    course_id = _create_course(db_client, setup['token_a'], 'Full Workflow')
    _add_lesson(db_app, course_id)

    pub_resp = db_client.post(f'/api/v1/courses/{course_id}/publish',
                              headers=_auth(setup['token_a']))
    assert pub_resp.status_code == 200
    assert json.loads(pub_resp.data)['data']['is_published'] is True

    unpub_resp = db_client.post(f'/api/v1/courses/{course_id}/unpublish',
                                headers=_auth(setup['token_a']))
    assert unpub_resp.status_code == 200
    assert json.loads(unpub_resp.data)['data']['is_published'] is False
