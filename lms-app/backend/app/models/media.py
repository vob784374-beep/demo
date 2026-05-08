from datetime import datetime, timezone
from app.extensions import db


class CourseMedia(db.Model):
    __tablename__ = 'course_media'
    __table_args__ = (
        db.Index('idx_course_media_lesson_id', 'lesson_id'),
    )

    id = db.Column(db.Integer, primary_key=True)
    lesson_id = db.Column(db.Integer, db.ForeignKey('lessons.id'), nullable=False)
    course_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    s3_key = db.Column(db.String(500), nullable=False)
    content_type = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc))
