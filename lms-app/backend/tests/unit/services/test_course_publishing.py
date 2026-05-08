"""Unit tests for course_service publish/unpublish — Story 3.2."""
import pytest
from app import create_app
from app.extensions import db as _db
from app.models.course import Course, CourseEnrollment
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
        _db.session.query(CourseEnrollment).delete()
        _db.session.query(Lesson).delete()
        _db.session.query(Course).delete()
        _db.session.query(UserRole).delete()
        _db.session.query(User).delete()
        _db.session.commit()
    yield


def _make_teacher(app, email='t@test.com') -> int:
    with app.app_context():
        role = _db.session.query(Role).filter_by(name='teacher').first()
        if not role:
            role = Role(name='teacher')
            _db.session.add(role)
            _db.session.flush()
        user = User(email=email, password_hash='x', first_name='T', last_name='T')
        _db.session.add(user)
        _db.session.flush()
        _db.session.add(UserRole(user_id=user.id, role_id=role.id))
        _db.session.commit()
        return user.id


def _make_course(app, teacher_id, title='Test Course') -> int:
    with app.app_context():
        c = Course(teacher_id=teacher_id, title=title)
        _db.session.add(c)
        _db.session.commit()
        return c.id


def _make_lesson(app, course_id, title='Lesson 1') -> int:
    with app.app_context():
        lesson = Lesson(course_id=course_id, title=title)
        _db.session.add(lesson)
        _db.session.commit()
        return lesson.id


# ── publish_course ────────────────────────────────────────────────────────────

def test_publish_course_returns_is_published_true(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    _make_lesson(svc_app, course_id)
    with svc_app.app_context():
        result = course_service.publish_course(course_id, teacher_id)
    assert result['is_published'] is True


def test_publish_course_returns_dict(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id, 'My Course')
    _make_lesson(svc_app, course_id)
    with svc_app.app_context():
        result = course_service.publish_course(course_id, teacher_id)
    assert result['id'] == course_id
    assert result['title'] == 'My Course'


def test_publish_course_persists_to_db(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    _make_lesson(svc_app, course_id)
    with svc_app.app_context():
        course_service.publish_course(course_id, teacher_id)
        course = _db.session.get(Course, course_id)
    assert course.is_published is True


def test_publish_course_already_published_is_idempotent(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    _make_lesson(svc_app, course_id)
    with svc_app.app_context():
        course_service.publish_course(course_id, teacher_id)
        result = course_service.publish_course(course_id, teacher_id)
    assert result['is_published'] is True


def test_publish_course_raises_value_error_with_no_lessons(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    with svc_app.app_context():
        with pytest.raises(ValueError, match='at least one lesson'):
            course_service.publish_course(course_id, teacher_id)


def test_publish_course_raises_permission_error_for_wrong_teacher(svc_app):
    t1 = _make_teacher(svc_app, 'ta@pub.com')
    t2 = _make_teacher(svc_app, 'tb@pub.com')
    course_id = _make_course(svc_app, t1)
    _make_lesson(svc_app, course_id)
    with svc_app.app_context():
        with pytest.raises(PermissionError):
            course_service.publish_course(course_id, t2)


def test_publish_course_raises_lookup_error_for_missing(svc_app):
    teacher_id = _make_teacher(svc_app)
    with svc_app.app_context():
        with pytest.raises(LookupError):
            course_service.publish_course(999999, teacher_id)


# ── unpublish_course ──────────────────────────────────────────────────────────

def test_unpublish_course_returns_is_published_false(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    _make_lesson(svc_app, course_id)
    with svc_app.app_context():
        course_service.publish_course(course_id, teacher_id)
        result = course_service.unpublish_course(course_id, teacher_id)
    assert result['is_published'] is False


def test_unpublish_course_persists_to_db(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    _make_lesson(svc_app, course_id)
    with svc_app.app_context():
        course_service.publish_course(course_id, teacher_id)
        course_service.unpublish_course(course_id, teacher_id)
        course = _db.session.get(Course, course_id)
    assert course.is_published is False


def test_unpublish_course_already_unpublished_is_idempotent(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    with svc_app.app_context():
        result = course_service.unpublish_course(course_id, teacher_id)
    assert result['is_published'] is False


def test_unpublish_course_raises_permission_error_for_wrong_teacher(svc_app):
    t1 = _make_teacher(svc_app, 'tc@pub.com')
    t2 = _make_teacher(svc_app, 'td@pub.com')
    course_id = _make_course(svc_app, t1)
    with svc_app.app_context():
        with pytest.raises(PermissionError):
            course_service.unpublish_course(course_id, t2)


def test_unpublish_course_raises_lookup_error_for_missing(svc_app):
    teacher_id = _make_teacher(svc_app)
    with svc_app.app_context():
        with pytest.raises(LookupError):
            course_service.unpublish_course(999999, teacher_id)
