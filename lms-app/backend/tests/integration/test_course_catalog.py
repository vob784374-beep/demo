"""
Integration tests for Story 3.3: Public Course Catalog API
  GET /api/v1/courses           — public paginated list
  GET /api/v1/courses/<id>      — public detail (published only) / owner detail
"""
import json
import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

TEACHER = {
    'email': 'catalog_teacher@x.com',
    'password': 'SecurePass1!',
    'first_name': 'Carol',
    'last_name': 'Catalog',
}

STUDENT = {
    'email': 'catalog_student@x.com',
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


def _create_course(client, token, title='Test') -> int:
    resp = client.post('/api/v1/courses', json={'title': title}, headers=_auth(token))
    assert resp.status_code == 201, resp.data
    return json.loads(resp.data)['data']['id']


def _add_lesson(db_app, course_id):
    from app.extensions import db as _db
    from app.models.lesson import Lesson
    with db_app.app_context():
        _db.session.add(Lesson(course_id=course_id, title='L'))
        _db.session.commit()


def _publish(client, token, course_id):
    resp = client.post(f'/api/v1/courses/{course_id}/publish', headers=_auth(token))
    assert resp.status_code == 200, resp.data


@pytest.fixture
def setup(db_app, db_client):
    with db_app.app_context():
        _register(db_client, TEACHER)
        _set_role(TEACHER['email'], 'teacher')
        _register(db_client, STUDENT)

    token_t = _login(db_client, TEACHER)
    token_s = _login(db_client, STUDENT)
    return {'token_t': token_t, 'token_s': token_s}


# ── GET /api/v1/courses — list ────────────────────────────────────────────────

def test_list_no_auth_returns_200(db_client):
    resp = db_client.get('/api/v1/courses')
    assert resp.status_code == 200


def test_list_returns_only_published(setup, db_app, db_client):
    cid = _create_course(db_client, setup['token_t'], 'Draft Course')
    pub_id = _create_course(db_client, setup['token_t'], 'Published Course')
    _add_lesson(db_app, pub_id)
    _publish(db_client, setup['token_t'], pub_id)

    resp = db_client.get('/api/v1/courses')
    data = json.loads(resp.data)['data']
    titles = [c['title'] for c in data]
    assert 'Published Course' in titles
    assert 'Draft Course' not in titles


def test_list_meta_structure(setup, db_client):
    resp = db_client.get('/api/v1/courses')
    body = json.loads(resp.data)
    assert 'data' in body
    assert body['success'] is True
    meta = body['meta']
    assert 'page' in meta
    assert 'per_page' in meta
    assert 'total' in meta


def test_list_default_pagination(setup, db_app, db_client):
    resp = db_client.get('/api/v1/courses')
    meta = json.loads(resp.data)['meta']
    assert meta['page'] == 1
    assert meta['per_page'] == 20


def test_list_custom_per_page(setup, db_app, db_client):
    for i in range(5):
        cid = _create_course(db_client, setup['token_t'], f'Course {i}')
        _add_lesson(db_app, cid)
        _publish(db_client, setup['token_t'], cid)

    resp = db_client.get('/api/v1/courses?per_page=3')
    body = json.loads(resp.data)
    assert len(body['data']) == 3
    assert body['meta']['total'] == 5


def test_list_page_2(setup, db_app, db_client):
    for i in range(4):
        cid = _create_course(db_client, setup['token_t'], f'P{i}')
        _add_lesson(db_app, cid)
        _publish(db_client, setup['token_t'], cid)

    p1 = json.loads(db_client.get('/api/v1/courses?per_page=3').data)
    p2 = json.loads(db_client.get('/api/v1/courses?page=2&per_page=3').data)
    assert len(p1['data']) == 3
    assert len(p2['data']) == 1
    assert p2['meta']['page'] == 2


def test_list_invalid_page_returns_422(db_client):
    resp = db_client.get('/api/v1/courses?page=abc')
    assert resp.status_code == 422


def test_list_per_page_capped_at_100(setup, db_app, db_client):
    resp = db_client.get('/api/v1/courses?per_page=999')
    assert resp.status_code == 200
    assert json.loads(resp.data)['meta']['per_page'] == 100


def test_list_empty_catalog_returns_zero_total(db_client):
    resp = db_client.get('/api/v1/courses')
    body = json.loads(resp.data)
    assert body['meta']['total'] == 0
    assert body['data'] == []


# ── GET /api/v1/courses/<id> — public detail ─────────────────────────────────

def test_get_published_course_no_auth_returns_200(setup, db_app, db_client):
    cid = _create_course(db_client, setup['token_t'], 'Public')
    _add_lesson(db_app, cid)
    _publish(db_client, setup['token_t'], cid)

    resp = db_client.get(f'/api/v1/courses/{cid}')
    assert resp.status_code == 200


def test_get_published_course_includes_lesson_count(setup, db_app, db_client):
    cid = _create_course(db_client, setup['token_t'], 'With Lessons')
    _add_lesson(db_app, cid)
    _add_lesson(db_app, cid)
    _publish(db_client, setup['token_t'], cid)

    data = json.loads(db_client.get(f'/api/v1/courses/{cid}').data)['data']
    assert data['lesson_count'] == 2


def test_get_published_course_includes_teacher_name(setup, db_app, db_client):
    cid = _create_course(db_client, setup['token_t'], 'Named Teacher')
    _add_lesson(db_app, cid)
    _publish(db_client, setup['token_t'], cid)

    data = json.loads(db_client.get(f'/api/v1/courses/{cid}').data)['data']
    assert data['teacher_name'] == 'Carol Catalog'


def test_get_unpublished_course_no_auth_returns_404(setup, db_client):
    cid = _create_course(db_client, setup['token_t'], 'Draft')
    resp = db_client.get(f'/api/v1/courses/{cid}')
    assert resp.status_code == 404


def test_get_nonexistent_course_returns_404(db_client):
    resp = db_client.get('/api/v1/courses/999999')
    assert resp.status_code == 404


def test_owner_can_get_unpublished_course(setup, db_client):
    cid = _create_course(db_client, setup['token_t'], 'My Draft')
    resp = db_client.get(f'/api/v1/courses/{cid}', headers=_auth(setup['token_t']))
    assert resp.status_code == 200


def test_non_owner_gets_404_for_unpublished(setup, db_client, db_app):
    from app.extensions import db as _db
    from app.models.user import User, Role, UserRole
    other = {'email': 'other_t@x.com', 'password': 'SecurePass1!', 'first_name': 'X', 'last_name': 'Y'}
    _register(db_client, other)
    with db_app.app_context():
        _set_role(other['email'], 'teacher')
    other_token = _login(db_client, other)

    cid = _create_course(db_client, setup['token_t'], 'Private Draft')
    resp = db_client.get(f'/api/v1/courses/{cid}', headers=_auth(other_token))
    assert resp.status_code == 404


def test_student_can_get_published_course(setup, db_app, db_client):
    cid = _create_course(db_client, setup['token_t'], 'Open Course')
    _add_lesson(db_app, cid)
    _publish(db_client, setup['token_t'], cid)

    resp = db_client.get(f'/api/v1/courses/{cid}', headers=_auth(setup['token_s']))
    assert resp.status_code == 200
