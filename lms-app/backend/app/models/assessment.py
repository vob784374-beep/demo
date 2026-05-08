from datetime import datetime, timezone
from app.extensions import db


class Assessment(db.Model):
    __tablename__ = 'assessments'
    __table_args__ = (
        db.Index('idx_assessments_lesson_id', 'lesson_id'),
    )

    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    passing_score = db.Column(db.Integer, nullable=False, default=70)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    submissions = db.relationship('AssessmentSubmission', backref='assessment', lazy='dynamic')


class AssessmentSubmission(db.Model):
    __tablename__ = 'assessment_submissions'
    __table_args__ = (
        db.Index('idx_assessment_submissions_student_id', 'student_id'),
        db.Index('idx_assessment_submissions_assessment_id', 'assessment_id'),
        db.CheckConstraint("status IN ('submitted', 'graded')", name='ck_assessment_submissions_status'),
    )

    id = db.Column(db.Integer, primary_key=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey('assessments.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    answers = db.Column(db.JSON, nullable=True)
    score = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='submitted')
    has_passed = db.Column(db.Boolean, nullable=True)
    feedback = db.Column(db.Text, nullable=True)
    submitted_at = db.Column(db.DateTime, nullable=False,
                             default=lambda: datetime.now(timezone.utc))
    graded_at = db.Column(db.DateTime, nullable=True)
