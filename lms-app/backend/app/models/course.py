from datetime import datetime, timezone
from app.extensions import db


class Course(db.Model):
    __tablename__ = 'courses'
    __table_args__ = (
        db.Index('idx_courses_teacher_id', 'teacher_id'),
    )

    id = db.Column(db.Integer, primary_key=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    is_published = db.Column(db.Boolean, nullable=False, default=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    lessons = db.relationship('Lesson', backref='course', lazy='dynamic',
                              order_by='Lesson.order')
    enrollments = db.relationship('CourseEnrollment',
                                  foreign_keys='CourseEnrollment.course_id',
                                  backref='course', lazy='dynamic')
    media = db.relationship('CourseMedia', backref='course', lazy='dynamic')


class CourseEnrollment(db.Model):
    __tablename__ = 'course_enrollments'
    __table_args__ = (
        db.UniqueConstraint('course_id', 'student_id', name='uq_course_enrollments'),
        db.Index('idx_course_enrollments_student_id', 'student_id'),
    )

    id = db.Column(db.Integer, primary_key=True)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    enrolled_at = db.Column(db.DateTime, nullable=False,
                            default=lambda: datetime.now(timezone.utc))
