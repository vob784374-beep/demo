from datetime import datetime, timezone
from app.extensions import db


class Lesson(db.Model):
    __tablename__ = 'lessons'
    __table_args__ = (
        db.Index('idx_lessons_course_id', 'course_id'),
    )

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text)
    order = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    progress_records = db.relationship('LessonProgress', backref='lesson', lazy='dynamic')
    exercises = db.relationship('Exercise', backref='lesson', lazy='dynamic')
    assessments = db.relationship('Assessment', backref='lesson', lazy='dynamic')
    media = db.relationship('CourseMedia', backref='lesson', lazy='dynamic')


class LessonProgress(db.Model):
    __tablename__ = 'lesson_progress'
    __table_args__ = (
        db.UniqueConstraint('student_id', 'lesson_id', name='uq_lesson_progress'),
        db.CheckConstraint("status IN ('not_started', 'in_progress', 'completed')", name='ck_lesson_progress_status'),
    )

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='not_started')
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
