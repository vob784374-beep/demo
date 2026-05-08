"""Unit tests for course_service catalog functions — Story 3.3."""
import pytest
from app import create_app
from app.extensions import db as _db
from app.models.course import Course
from app.models.lesson import Lesson
from app.models.user import User, Role, UserRole
from app.services import course_service


@pytest.fixture(scope='module')
def svc_app():
    app = create_app('testing')
    with app.app_context():
        _db.create_all()
        yield app
        _db.drop_all()


@pytest.fixture(autouse=True)
def clean_tables(svc_app):
    with svc_app.app_context():
        _db.session.query(Lesson).delete()
        _db.session.query(Course).delete()
        _db.session.query(UserRole).delete()
        _db.session.query(User).delete()
        _db.session.commit()
    yield


def _make_teacher(app, email='teacher@x.com', first='Alice', last='Smith') -> int:
    with app.app_context():
        role = _db.session.query(Role).filter_by(name='teacher').first()
        if not role:
            role = Role(name='teacher')
            _db.session.add(role)
            _db.session.flush()
        user = User(email=email, password_hash='x', first_name=first, last_name=last)
        _db.session.add(user)
        _db.session.flush()
        _db.session.add(UserRole(user_id=user.id, role_id=role.id))
        _db.session.commit()
        return user.id


def _make_course(app, teacher_id, title='Course', published=False) -> int:
    with app.app_context():
        c = Course(teacher_id=teacher_id, title=title, is_published=published)
        _db.session.add(c)
        _db.session.commit()
        return c.id


def _make_lesson(app, course_id) -> int:
    with app.app_context():
        lesson = Lesson(course_id=course_id, title='Lesson')
        _db.session.add(lesson)
        _db.session.commit()
        return lesson.id


# ── list_published_courses ────────────────────────────────────────────────────

def test_list_returns_only_published(svc_app):
    teacher_id = _make_teacher(svc_app)
    _make_course(svc_app, teacher_id, 'Draft')
    _make_course(svc_app, teacher_id, 'Live', published=True)
    with svc_app.app_context():
        result = course_service.list_published_courses(1, 20)
    assert result['total'] == 1
    assert result['items'][0]['title'] == 'Live'


def test_list_excludes_deleted(svc_app):
    from datetime import datetime, timezone
    teacher_id = _make_teacher(svc_app)
    with svc_app.app_context():
        c = Course(teacher_id=teacher_id, title='Deleted', is_published=True,
                   deleted_at=datetime.now(timezone.utc))
        _db.session.add(c)
        _db.session.commit()
        result = course_service.list_published_courses(1, 20)
    assert result['total'] == 0


def test_list_pagination(svc_app):
    teacher_id = _make_teacher(svc_app)
    for i in range(5):
        _make_course(svc_app, teacher_id, f'Course {i}', published=True)
    with svc_app.app_context():
        p1 = course_service.list_published_courses(1, 3)
        p2 = course_service.list_published_courses(2, 3)
    assert len(p1['items']) == 3
    assert len(p2['items']) == 2
    assert p1['total'] == 5


def test_list_total_reflects_all_published(svc_app):
    teacher_id = _make_teacher(svc_app)
    for i in range(4):
        _make_course(svc_app, teacher_id, f'C{i}', published=True)
    with svc_app.app_context():
        result = course_service.list_published_courses(1, 2)
    assert result['total'] == 4
    assert len(result['items']) == 2


def test_list_empty_returns_zero(svc_app):
    with svc_app.app_context():
        result = course_service.list_published_courses(1, 20)
    assert result['total'] == 0
    assert result['items'] == []


def test_list_returns_correct_page_and_per_page_in_result(svc_app):
    teacher_id = _make_teacher(svc_app)
    _make_course(svc_app, teacher_id, 'X', published=True)
    with svc_app.app_context():
        result = course_service.list_published_courses(2, 10)
    assert result['page'] == 2
    assert result['per_page'] == 10


# ── get_published_course ──────────────────────────────────────────────────────

def test_get_published_course_returns_dict(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id, 'Public Course', published=True)
    with svc_app.app_context():
        result = course_service.get_published_course(course_id)
    assert result is not None
    assert result['title'] == 'Public Course'


def test_get_published_course_includes_lesson_count(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id, published=True)
    _make_lesson(svc_app, course_id)
    _make_lesson(svc_app, course_id)
    with svc_app.app_context():
        result = course_service.get_published_course(course_id)
    assert result['lesson_count'] == 2


def test_get_published_course_includes_teacher_name(svc_app):
    teacher_id = _make_teacher(svc_app, first='Jane', last='Doe')
    course_id = _make_course(svc_app, teacher_id, published=True)
    with svc_app.app_context():
        result = course_service.get_published_course(course_id)
    assert result['teacher_name'] == 'Jane Doe'


def test_get_published_course_returns_none_for_unpublished(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id, published=False)
    with svc_app.app_context():
        result = course_service.get_published_course(course_id)
    assert result is None


def test_get_published_course_returns_none_for_missing(svc_app):
    with svc_app.app_context():
        result = course_service.get_published_course(999999)
    assert result is None


def test_get_published_course_zero_lessons(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id, published=True)
    with svc_app.app_context():
        result = course_service.get_published_course(course_id)
    assert result['lesson_count'] == 0
