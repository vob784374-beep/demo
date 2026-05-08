"""
Integration tests for Story 3.1: Course Creation and Management API
  POST   /api/v1/courses
  GET    /api/v1/courses/<id>
  PATCH  /api/v1/courses/<id>
  DELETE /api/v1/courses/<id>
"""
import json
import pytest


# ── Fixtures & helpers ────────────────────────────────────────────────────────

TEACHER_A = {
    'email': 'teacher_a@courses.com',
    'password': 'SecurePass1!',
    'first_name': 'Alice',
    'last_name': 'Teacher',
}

TEACHER_B = {
    'email': 'teacher_b@courses.com',
    'password': 'SecurePass1!',
    'first_name': 'Bob',
    'last_name': 'Teacher',
}

STUDENT = {
    'email': 'student@courses.com',
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
    """Change user role. Must be called within an active app context (db_app fixture provides it)."""
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


@pytest.fixture
def setup(db_app, db_client):
    """Registers two teachers and one student, returns their tokens.
    _set_role uses the app context that db_app keeps open throughout the test.
    """
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


# ── POST /api/v1/courses ──────────────────────────────────────────────────────

def test_create_course_returns_201(setup, db_client):
    resp = db_client.post('/api/v1/courses', json={
        'title': 'Python Basics',
        'description': 'Learn Python',
        'category': 'Programming',
    }, headers=_auth(setup['token_a']))
    assert resp.status_code == 201


def test_create_course_returns_course_object(setup, db_client):
    resp = db_client.post('/api/v1/courses', json={'title': 'Intro to SQL'},
                          headers=_auth(setup['token_a']))
    data = json.loads(resp.data)['data']
    assert data['title'] == 'Intro to SQL'
    assert data['is_published'] is False
    assert 'id' in data
    assert 'teacher_id' in data


def test_create_course_is_unpublished_by_default(setup, db_client):
    resp = db_client.post('/api/v1/courses', json={'title': 'Draft Course'},
                          headers=_auth(setup['token_a']))
    assert json.loads(resp.data)['data']['is_published'] is False


def test_create_course_optional_fields_default_to_null(setup, db_client):
    resp = db_client.post('/api/v1/courses', json={'title': 'Minimal'},
                          headers=_auth(setup['token_a']))
    data = json.loads(resp.data)['data']
    assert data['description'] is None
    assert data['category'] is None


def test_create_course_student_returns_403(setup, db_client):
    resp = db_client.post('/api/v1/courses', json={'title': 'Not Allowed'},
                          headers=_auth(setup['token_s']))
    assert resp.status_code == 403


def test_create_course_no_auth_returns_401(db_client):
    resp = db_client.post('/api/v1/courses', json={'title': 'No Auth'})
    assert resp.status_code == 401


def test_create_course_missing_title_returns_422(setup, db_client):
    resp = db_client.post('/api/v1/courses', json={'description': 'no title'},
                          headers=_auth(setup['token_a']))
    assert resp.status_code == 422


def test_create_course_empty_title_returns_422(setup, db_client):
    resp = db_client.post('/api/v1/courses', json={'title': ''},
                          headers=_auth(setup['token_a']))
    assert resp.status_code == 422


def test_create_course_envelope_structure(setup, db_client):
    resp = db_client.post('/api/v1/courses', json={'title': 'Envelope Test'},
                          headers=_auth(setup['token_a']))
    body = json.loads(resp.data)
    assert 'data' in body
    assert body['meta'] is None
    assert body['success'] is True


# ── GET /api/v1/courses/<id> ──────────────────────────────────────────────────

def test_get_course_by_owner_returns_200(setup, db_client):
    create_resp = db_client.post('/api/v1/courses', json={'title': 'My Course'},
                                 headers=_auth(setup['token_a']))
    course_id = json.loads(create_resp.data)['data']['id']

    resp = db_client.get(f'/api/v1/courses/{course_id}', headers=_auth(setup['token_a']))
    assert resp.status_code == 200
    assert json.loads(resp.data)['data']['id'] == course_id


def test_get_course_by_other_teacher_returns_404(setup, db_client):
    create_resp = db_client.post('/api/v1/courses', json={'title': "Alice's Course"},
                                 headers=_auth(setup['token_a']))
    course_id = json.loads(create_resp.data)['data']['id']

    resp = db_client.get(f'/api/v1/courses/{course_id}', headers=_auth(setup['token_b']))
    assert resp.status_code == 404


def test_get_nonexistent_course_returns_404(setup, db_client):
    resp = db_client.get('/api/v1/courses/999999', headers=_auth(setup['token_a']))
    assert resp.status_code == 404


# ── PATCH /api/v1/courses/<id> ────────────────────────────────────────────────

def test_update_course_returns_200(setup, db_client):
    create_resp = db_client.post('/api/v1/courses', json={'title': 'Old Title'},
                                 headers=_auth(setup['token_a']))
    course_id = json.loads(create_resp.data)['data']['id']

    resp = db_client.patch(f'/api/v1/courses/{course_id}', json={'title': 'New Title'},
                           headers=_auth(setup['token_a']))
    assert resp.status_code == 200
    assert json.loads(resp.data)['data']['title'] == 'New Title'


def test_update_course_partial_update(setup, db_client):
    create_resp = db_client.post('/api/v1/courses', json={
        'title': 'Original', 'category': 'Science',
    }, headers=_auth(setup['token_a']))
    course_id = json.loads(create_resp.data)['data']['id']

    resp = db_client.patch(f'/api/v1/courses/{course_id}',
                           json={'description': 'Added description'},
                           headers=_auth(setup['token_a']))
    data = json.loads(resp.data)['data']
    assert data['title'] == 'Original'
    assert data['description'] == 'Added description'
    assert data['category'] == 'Science'


def test_update_course_by_non_owner_returns_403(setup, db_client):
    create_resp = db_client.post('/api/v1/courses', json={'title': 'Owned by A'},
                                 headers=_auth(setup['token_a']))
    course_id = json.loads(create_resp.data)['data']['id']

    resp = db_client.patch(f'/api/v1/courses/{course_id}', json={'title': 'Stolen'},
                           headers=_auth(setup['token_b']))
    assert resp.status_code == 403


def test_update_nonexistent_course_returns_404(setup, db_client):
    resp = db_client.patch('/api/v1/courses/999999', json={'title': 'Ghost'},
                           headers=_auth(setup['token_a']))
    assert resp.status_code == 404


def test_update_course_empty_body_returns_422(setup, db_client):
    create_resp = db_client.post('/api/v1/courses', json={'title': 'Some Course'},
                                 headers=_auth(setup['token_a']))
    course_id = json.loads(create_resp.data)['data']['id']

    resp = db_client.patch(f'/api/v1/courses/{course_id}', json={},
                           headers=_auth(setup['token_a']))
    assert resp.status_code == 422


# ── DELETE /api/v1/courses/<id> ───────────────────────────────────────────────

def test_delete_course_returns_204(setup, db_client):
    create_resp = db_client.post('/api/v1/courses', json={'title': 'To Delete'},
                                 headers=_auth(setup['token_a']))
    course_id = json.loads(create_resp.data)['data']['id']

    resp = db_client.delete(f'/api/v1/courses/{course_id}', headers=_auth(setup['token_a']))
    assert resp.status_code == 204


def test_delete_course_makes_it_unfetchable(setup, db_client):
    create_resp = db_client.post('/api/v1/courses', json={'title': 'Soon Gone'},
                                 headers=_auth(setup['token_a']))
    course_id = json.loads(create_resp.data)['data']['id']

    db_client.delete(f'/api/v1/courses/{course_id}', headers=_auth(setup['token_a']))
    resp = db_client.get(f'/api/v1/courses/{course_id}', headers=_auth(setup['token_a']))
    assert resp.status_code == 404


def test_delete_course_by_non_owner_returns_403(setup, db_client):
    create_resp = db_client.post('/api/v1/courses', json={'title': "Alice's"},
                                 headers=_auth(setup['token_a']))
    course_id = json.loads(create_resp.data)['data']['id']

    resp = db_client.delete(f'/api/v1/courses/{course_id}', headers=_auth(setup['token_b']))
    assert resp.status_code == 403


def test_delete_nonexistent_course_returns_404(setup, db_client):
    resp = db_client.delete('/api/v1/courses/999999', headers=_auth(setup['token_a']))
    assert resp.status_code == 404


def test_delete_course_with_enrollments_returns_422(setup, db_app, db_client):
    create_resp = db_client.post('/api/v1/courses', json={'title': 'Has Students'},
                                 headers=_auth(setup['token_a']))
    assert create_resp.status_code == 201, create_resp.data
    course_id = json.loads(create_resp.data)['data']['id']

    from app.extensions import db as _db
    from app.models.course import CourseEnrollment
    from app.models.user import User
    with db_app.app_context():
        student = _db.session.query(User).filter_by(email=STUDENT['email']).first()
        assert student is not None, 'Student not found in DB'
        _db.session.add(CourseEnrollment(course_id=course_id, student_id=student.id))
        _db.session.commit()

    resp = db_client.delete(f'/api/v1/courses/{course_id}', headers=_auth(setup['token_a']))
    assert resp.status_code == 422
