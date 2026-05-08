"""Unit tests for course_service — all DB ops tested via in-memory SQLite."""
import pytest
from app import create_app
from app.extensions import db as _db
from app.models.course import Course, CourseEnrollment
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


# ── create_course ─────────────────────────────────────────────────────────────

def test_create_course_returns_dict(svc_app):
    teacher_id = _make_teacher(svc_app)
    with svc_app.app_context():
        result = course_service.create_course(
            teacher_id=teacher_id, title='My Course', description=None, category=None
        )
    assert result['title'] == 'My Course'
    assert result['is_published'] is False
    assert result['teacher_id'] == teacher_id


def test_create_course_sets_published_false(svc_app):
    teacher_id = _make_teacher(svc_app)
    with svc_app.app_context():
        result = course_service.create_course(
            teacher_id=teacher_id, title='X', description=None, category=None
        )
    assert result['is_published'] is False


def test_create_course_persists_to_db(svc_app):
    teacher_id = _make_teacher(svc_app)
    with svc_app.app_context():
        result = course_service.create_course(
            teacher_id=teacher_id, title='Persist Test', description='desc', category='Cat'
        )
        course = _db.session.get(Course, result['id'])
    assert course is not None
    assert course.title == 'Persist Test'


# ── get_course_for_teacher ────────────────────────────────────────────────────

def test_get_course_returns_dict_for_owner(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    with svc_app.app_context():
        result = course_service.get_course_for_teacher(course_id, teacher_id)
    assert result['id'] == course_id


def test_get_course_returns_none_for_wrong_teacher(svc_app):
    t1 = _make_teacher(svc_app, 'ta@x.com')
    t2 = _make_teacher(svc_app, 'tb@x.com')
    course_id = _make_course(svc_app, t1)
    with svc_app.app_context():
        result = course_service.get_course_for_teacher(course_id, t2)
    assert result is None


def test_get_course_returns_none_for_missing_id(svc_app):
    teacher_id = _make_teacher(svc_app)
    with svc_app.app_context():
        result = course_service.get_course_for_teacher(999999, teacher_id)
    assert result is None


# ── update_course ─────────────────────────────────────────────────────────────

def test_update_course_returns_updated_dict(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id, 'Old')
    with svc_app.app_context():
        result = course_service.update_course(course_id, teacher_id, {'title': 'New'})
    assert result['title'] == 'New'


def test_update_course_raises_permission_error_for_wrong_teacher(svc_app):
    t1 = _make_teacher(svc_app, 'tc@x.com')
    t2 = _make_teacher(svc_app, 'td@x.com')
    course_id = _make_course(svc_app, t1)
    with svc_app.app_context():
        with pytest.raises(PermissionError):
            course_service.update_course(course_id, t2, {'title': 'Stolen'})


def test_update_course_raises_lookup_error_for_missing(svc_app):
    teacher_id = _make_teacher(svc_app)
    with svc_app.app_context():
        with pytest.raises(LookupError):
            course_service.update_course(999999, teacher_id, {'title': 'Ghost'})


# ── delete_course ─────────────────────────────────────────────────────────────

def test_delete_course_soft_deletes(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    with svc_app.app_context():
        course_service.delete_course(course_id, teacher_id)
        course = _db.session.get(Course, course_id)
    assert course.deleted_at is not None


def test_delete_course_raises_permission_error_for_wrong_teacher(svc_app):
    t1 = _make_teacher(svc_app, 'te@x.com')
    t2 = _make_teacher(svc_app, 'tf@x.com')
    course_id = _make_course(svc_app, t1)
    with svc_app.app_context():
        with pytest.raises(PermissionError):
            course_service.delete_course(course_id, t2)


def test_delete_course_raises_lookup_error_for_missing(svc_app):
    teacher_id = _make_teacher(svc_app)
    with svc_app.app_context():
        with pytest.raises(LookupError):
            course_service.delete_course(999999, teacher_id)


def test_delete_course_raises_value_error_when_students_enrolled(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    student_id = _make_teacher(svc_app, 'student@x.com')  # user with any role is fine for enrollment

    with svc_app.app_context():
        _db.session.add(CourseEnrollment(course_id=course_id, student_id=student_id))
        _db.session.commit()
        with pytest.raises(ValueError):
            course_service.delete_course(course_id, teacher_id)


def test_delete_course_idempotent_second_delete_raises_lookup(svc_app):
    teacher_id = _make_teacher(svc_app)
    course_id = _make_course(svc_app, teacher_id)
    with svc_app.app_context():
        course_service.delete_course(course_id, teacher_id)
        with pytest.raises(LookupError):
            course_service.delete_course(course_id, teacher_id)


# ── enroll_student ────────────────────────────────────────────────────────────

def _make_published_course(app, teacher_id, title='Published') -> int:
    from app.models.lesson import Lesson
    with app.app_context():
        c = Course(teacher_id=teacher_id, title=title, is_published=True)
        _db.session.add(c)
        _db.session.flush()
        _db.session.add(Lesson(course_id=c.id, title='L'))
        _db.session.commit()
        return c.id


def _make_student(app, email='s@test.com') -> int:
    with app.app_context():
        user = User(email=email, password_hash='x', first_name='S', last_name='S')
        _db.session.add(user)
        _db.session.commit()
        return user.id


def test_enroll_student_returns_enrollment_dict(svc_app):
    teacher_id = _make_teacher(svc_app, 'et@x.com')
    student_id = _make_student(svc_app, 'es@x.com')
    course_id = _make_published_course(svc_app, teacher_id)
    with svc_app.app_context():
        result = course_service.enroll_student(course_id, student_id)
    assert result['course_id'] == course_id
    assert result['student_id'] == student_id
    assert 'enrolled_at' in result


def test_enroll_student_duplicate_raises_value_error(svc_app):
    teacher_id = _make_teacher(svc_app, 'et2@x.com')
    student_id = _make_student(svc_app, 'es2@x.com')
    course_id = _make_published_course(svc_app, teacher_id)
    with svc_app.app_context():
        course_service.enroll_student(course_id, student_id)
        with pytest.raises(ValueError, match='(?i)already enrolled'):
            course_service.enroll_student(course_id, student_id)


def test_enroll_student_nonexistent_course_raises_lookup_error(svc_app):
    student_id = _make_student(svc_app, 'es3@x.com')
    with svc_app.app_context():
        with pytest.raises(LookupError):
            course_service.enroll_student(999999, student_id)


def test_enroll_student_unpublished_course_raises_lookup_error(svc_app):
    teacher_id = _make_teacher(svc_app, 'et3@x.com')
    student_id = _make_student(svc_app, 'es4@x.com')
    course_id = _make_course(svc_app, teacher_id)  # not published
    with svc_app.app_context():
        with pytest.raises(LookupError):
            course_service.enroll_student(course_id, student_id)


# ── get_published_course (is_enrolled) ───────────────────────────────────────

def test_get_published_course_is_enrolled_none_when_no_student_id(svc_app):
    teacher_id = _make_teacher(svc_app, 'et4@x.com')
    course_id = _make_published_course(svc_app, teacher_id)
    with svc_app.app_context():
        result = course_service.get_published_course(course_id)
    assert result['is_enrolled'] is None


def test_get_published_course_is_enrolled_false_when_not_enrolled(svc_app):
    teacher_id = _make_teacher(svc_app, 'et5@x.com')
    student_id = _make_student(svc_app, 'es5@x.com')
    course_id = _make_published_course(svc_app, teacher_id)
    with svc_app.app_context():
        result = course_service.get_published_course(course_id, student_id=student_id)
    assert result['is_enrolled'] is False


def test_get_published_course_is_enrolled_true_after_enroll(svc_app):
    teacher_id = _make_teacher(svc_app, 'et6@x.com')
    student_id = _make_student(svc_app, 'es6@x.com')
    course_id = _make_published_course(svc_app, teacher_id)
    with svc_app.app_context():
        course_service.enroll_student(course_id, student_id)
        result = course_service.get_published_course(course_id, student_id=student_id)
    assert result['is_enrolled'] is True
