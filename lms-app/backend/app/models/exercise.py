from datetime import datetime, timezone
from app.extensions import db


class Exercise(db.Model):
    __tablename__ = 'exercises'
    __table_args__ = (
        db.Index('idx_exercises_lesson_id', 'lesson_id'),
        db.CheckConstraint("exercise_type IN ('multiple_choice')", name='ck_exercises_exercise_type'),
    )

    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    question = db.Column(db.Text, nullable=False)
    exercise_type = db.Column(db.String(50), nullable=False)
    options = db.Column(db.JSON, nullable=True)
    correct_answer = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    submissions = db.relationship('ExerciseSubmission', backref='exercise', lazy='dynamic')


class ExerciseSubmission(db.Model):
    __tablename__ = 'exercise_submissions'
    __table_args__ = (
        db.Index('idx_exercise_submissions_student_id', 'student_id'),
        db.Index('idx_exercise_submissions_exercise_id', 'exercise_id'),
        db.CheckConstraint('score IN (0, 100)', name='ck_exercise_submissions_score'),
    )

    id = db.Column(db.Integer, primary_key=True)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    answer = db.Column(db.String(255), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    submitted_at = db.Column(db.DateTime, nullable=False,
                             default=lambda: datetime.now(timezone.utc))
