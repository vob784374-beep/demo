"""
Integration tests for Story 3.5: Course Detail and Student Enrollment
  POST /api/v1/courses/<id>/enroll
  GET  /api/v1/courses/<id>  (is_enrolled field)
"""
import json
import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

TEACHER = {
    'email': 'enroll_teacher@x.com',
    'password': 'SecurePass1!',
    'first_name': 'Tom',
    'last_name': 'Teacher',
}

STUDENT = {
    'email': 'enroll_student@x.com',
    'password': 'SecurePass1!',
    'first_name': 'Sue',
    'last_name': 'Student',
}

STUDENT_2 = {
    'email': 'enroll_student2@x.com',
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
        'email': payload['email'], 'password': payload['password'],
    })
    assert resp.status_code == 200, resp.data
    return json.loads(resp.data)['data']['access_token']


def _set_role(db_app, email, role_name):
    from app.extensions import db as _db
    from app.models.user import User, Role, UserRole
    with db_app.app_context():
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


def _create_published_course(client, token, db_app, title='Test') -> int:
    resp = client.post('/api/v1/courses', json={'title': title}, headers=_auth(token))
    assert resp.status_code == 201, resp.data
    course_id = json.loads(resp.data)['data']['id']
    from app.extensions import db as _db
    from app.models.lesson import Lesson
    with db_app.app_context():
        _db.session.add(Lesson(course_id=course_id, title='L1'))
        _db.session.commit()
    resp = client.post(f'/api/v1/courses/{course_id}/publish', headers=_auth(token))
    assert resp.status_code == 200, resp.data
    return course_id


@pytest.fixture
def setup(db_app, db_client):
    with db_app.app_context():
        _register(db_client, TEACHER)
        _set_role(db_app, TEACHER['email'], 'teacher')
        _register(db_client, STUDENT)
        _set_role(db_app, STUDENT['email'], 'student')

    token_t = _login(db_client, TEACHER)
    token_s = _login(db_client, STUDENT)
    course_id = _create_published_course(db_client, token_t, db_app)
    return {'token_t': token_t, 'token_s': token_s, 'course_id': course_id}


# ── POST /api/v1/courses/<id>/enroll ─────────────────────────────────────────

def test_enroll_student_returns_201(setup, db_client):
    resp = db_client.post(
        f'/api/v1/courses/{setup["course_id"]}/enroll',
        headers=_auth(setup['token_s']),
    )
    assert resp.status_code == 201
    body = json.loads(resp.data)
    assert body['success'] is True
    assert body['data']['course_id'] == setup['course_id']
    assert 'enrolled_at' in body['data']


def test_enroll_creates_enrollment_record(setup, db_app, db_client):
    db_client.post(
        f'/api/v1/courses/{setup["course_id"]}/enroll',
        headers=_auth(setup['token_s']),
    )
    from app.extensions import db as _db
    from app.models.course import CourseEnrollment
    with db_app.app_context():
        count = _db.session.query(CourseEnrollment).filter_by(
            course_id=setup['course_id']
        ).count()
    assert count == 1


def test_enroll_duplicate_returns_422(setup, db_client):
    db_client.post(
        f'/api/v1/courses/{setup["course_id"]}/enroll',
        headers=_auth(setup['token_s']),
    )
    resp = db_client.post(
        f'/api/v1/courses/{setup["course_id"]}/enroll',
        headers=_auth(setup['token_s']),
    )
    assert resp.status_code == 422
    body = json.loads(resp.data)
    assert 'already enrolled' in body['message'].lower()


def test_enroll_unauthenticated_returns_401(setup, db_client):
    resp = db_client.post(f'/api/v1/courses/{setup["course_id"]}/enroll')
    assert resp.status_code == 401


def test_enroll_teacher_returns_403(setup, db_client):
    resp = db_client.post(
        f'/api/v1/courses/{setup["course_id"]}/enroll',
        headers=_auth(setup['token_t']),
    )
    assert resp.status_code == 403


def test_enroll_nonexistent_course_returns_404(setup, db_client):
    resp = db_client.post(
        '/api/v1/courses/999999/enroll',
        headers=_auth(setup['token_s']),
    )
    assert resp.status_code == 404


def test_enroll_unpublished_course_returns_404(setup, db_app, db_client):
    resp = db_client.post('/api/v1/courses', json={'title': 'Draft'}, headers=_auth(setup['token_t']))
    draft_id = json.loads(resp.data)['data']['id']

    resp = db_client.post(
        f'/api/v1/courses/{draft_id}/enroll',
        headers=_auth(setup['token_s']),
    )
    assert resp.status_code == 404


# ── GET /api/v1/courses/<id> — is_enrolled field ─────────────────────────────

def test_get_course_unauthenticated_is_enrolled_is_null(setup, db_client):
    resp = db_client.get(f'/api/v1/courses/{setup["course_id"]}')
    assert resp.status_code == 200
    data = json.loads(resp.data)['data']
    assert data['is_enrolled'] is None


def test_get_course_not_enrolled_is_enrolled_false(setup, db_client):
    resp = db_client.get(
        f'/api/v1/courses/{setup["course_id"]}',
        headers=_auth(setup['token_s']),
    )
    assert resp.status_code == 200
    data = json.loads(resp.data)['data']
    assert data['is_enrolled'] is False


def test_get_course_after_enroll_is_enrolled_true(setup, db_client):
    db_client.post(
        f'/api/v1/courses/{setup["course_id"]}/enroll',
        headers=_auth(setup['token_s']),
    )
    resp = db_client.get(
        f'/api/v1/courses/{setup["course_id"]}',
        headers=_auth(setup['token_s']),
    )
    assert resp.status_code == 200
    data = json.loads(resp.data)['data']
    assert data['is_enrolled'] is True


def test_get_course_includes_lesson_count_and_teacher_name(setup, db_client):
    resp = db_client.get(f'/api/v1/courses/{setup["course_id"]}')
    data = json.loads(resp.data)['data']
    assert data['lesson_count'] == 1
    assert data['teacher_name'] == 'Tom Teacher'
