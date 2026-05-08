import pytest
from app.models.user import User, Role, UserRole
from app.models.course import Course, CourseEnrollment
from app.models.lesson import Lesson, LessonProgress
from app.models.exercise import Exercise, ExerciseSubmission
from app.models.assessment import Assessment, AssessmentSubmission
from app.models.media import CourseMedia
from app.extensions import db


def test_all_models_importable():
    """Smoke: all 12 model classes importable with no errors."""
    assert User and Role and UserRole
    assert Course and CourseEnrollment
    assert Lesson and LessonProgress
    assert Exercise and ExerciseSubmission
    assert Assessment and AssessmentSubmission
    assert CourseMedia


def test_user_model_columns(db_app):
    with db_app.app_context():
        cols = {c.name for c in User.__table__.columns}
        required = {'id', 'email', 'password_hash', 'first_name',
                    'last_name', 'is_active', 'created_at', 'updated_at'}
        assert required.issubset(cols)


def test_users_email_index_is_unique(db_app):
    with db_app.app_context():
        indexes = {idx.name: idx for idx in User.__table__.indexes}
        assert 'idx_users_email' in indexes
        assert indexes['idx_users_email'].unique is True


def test_user_create_and_read(db_app):
    with db_app.app_context():
        user = User(email='test@example.com', password_hash='hashed',
                    first_name='Test', last_name='User')
        db.session.add(user)
        db.session.commit()
        fetched = db.session.execute(
            db.select(User).filter_by(email='test@example.com')
        ).scalar_one()
        assert fetched.first_name == 'Test'
        assert fetched.is_active is True


def test_all_tables_created(db_app):
    with db_app.app_context():
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        tables = set(inspector.get_table_names())
        expected = {
            'users', 'roles', 'user_roles', 'courses', 'course_enrollments',
            'lessons', 'lesson_progress', 'exercises', 'exercise_submissions',
            'assessments', 'assessment_submissions', 'course_media',
        }
        assert expected.issubset(tables), f'Missing tables: {expected - tables}'


def test_role_model_columns(db_app):
    with db_app.app_context():
        cols = {c.name for c in Role.__table__.columns}
        assert {'id', 'name', 'created_at'}.issubset(cols)


def test_lesson_progress_unique_constraint(db_app):
    with db_app.app_context():
        constraints = {c.name for c in LessonProgress.__table__.constraints}
        assert 'uq_lesson_progress' in constraints


def test_course_enrollment_unique_constraint(db_app):
    with db_app.app_context():
        constraints = {c.name for c in CourseEnrollment.__table__.constraints}
        assert 'uq_course_enrollments' in constraints


def test_existing_health_tests_unaffected(client):
    """Regression: health endpoint unaffected by model additions."""
    import json
    response = client.get('/api/v1/health')
    assert response.status_code == 200
    body = json.loads(response.data)
    assert body['success'] is True
    assert body['data'] == {'status': 'ok'}
    assert body['meta'] is None
