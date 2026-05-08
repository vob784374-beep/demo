from datetime import datetime, timezone
from app.extensions import db
from app.models.course import Course, CourseEnrollment
from app.models.lesson import Lesson
from app.models.user import User


def _course_to_dict(course: Course) -> dict:
    return {
        "id": course.id,
        "teacher_id": course.teacher_id,
        "title": course.title,
        "description": course.description,
        "category": course.category,
        "is_published": course.is_published,
        "created_at": course.created_at.isoformat(),
        "updated_at": course.updated_at.isoformat(),
    }


def create_course(
    *, teacher_id: int, title: str, description: str | None, category: str | None
) -> dict:
    course = Course(
        teacher_id=teacher_id,
        title=title,
        description=description,
        category=category,
    )
    db.session.add(course)
    db.session.commit()
    return _course_to_dict(course)


def get_course_for_teacher(course_id: int, teacher_id: int) -> dict | None:
    """Return the course dict if it exists, is not deleted, and is owned by teacher_id."""
    course = db.session.get(Course, course_id)
    if not course or course.deleted_at is not None or course.teacher_id != teacher_id:
        return None
    return _course_to_dict(course)


def update_course(course_id: int, teacher_id: int, fields: dict) -> dict:
    """
    Update allowed fields on a course.
    Raises PermissionError if teacher_id does not own the course.
    Raises LookupError if course is not found or soft-deleted.
    """
    course = db.session.get(Course, course_id)
    if not course or course.deleted_at is not None:
        raise LookupError("Course not found")
    if course.teacher_id != teacher_id:
        raise PermissionError("You do not own this course")

    for key, value in fields.items():
        if hasattr(course, key):
            setattr(course, key, value)

    course.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return _course_to_dict(course)


def delete_course(course_id: int, teacher_id: int) -> None:
    """
    Soft-delete a course.
    Raises PermissionError if teacher_id does not own the course.
    Raises LookupError if course is not found or already deleted.
    Raises ValueError if course has enrolled students.
    """
    course = db.session.get(Course, course_id)
    if not course or course.deleted_at is not None:
        raise LookupError("Course not found")
    if course.teacher_id != teacher_id:
        raise PermissionError("You do not own this course")

    enrollment_count = (
        db.session.query(CourseEnrollment).filter_by(course_id=course_id).count()
    )
    if enrollment_count > 0:
        raise ValueError("Cannot delete a course with enrolled students")

    course.deleted_at = datetime.now(timezone.utc)
    db.session.commit()


def list_published_courses(page: int, per_page: int) -> dict:
    """Return a page of published, non-deleted courses ordered newest-first."""
    query = (
        db.session.query(Course)
        .filter(Course.is_published.is_(True), Course.deleted_at.is_(None))
        .order_by(Course.created_at.desc())
    )
    total = query.count()
    courses = query.offset((page - 1) * per_page).limit(per_page).all()
    return {
        "items": [_course_to_dict(c) for c in courses],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


def get_published_course(course_id: int, student_id: int | None = None) -> dict | None:
    """Return a published course including lesson_count, teacher_name, and is_enrolled."""
    course = db.session.get(Course, course_id)
    if not course or course.deleted_at is not None or not course.is_published:
        return None
    lesson_count = db.session.query(Lesson).filter_by(course_id=course_id).count()
    teacher = db.session.get(User, course.teacher_id)
    result = _course_to_dict(course)
    result["lesson_count"] = lesson_count
    result["teacher_name"] = (
        f"{teacher.first_name} {teacher.last_name}" if teacher else None
    )
    if student_id is not None:
        result["is_enrolled"] = (
            db.session.query(CourseEnrollment)
            .filter_by(course_id=course_id, student_id=student_id)
            .first()
            is not None
        )
    else:
        result["is_enrolled"] = None
    return result


def enroll_student(course_id: int, student_id: int) -> dict:
    """
    Enroll a student in a published course.
    Raises LookupError if the course is not found or not published.
    Raises ValueError if the student is already enrolled.
    """
    course = db.session.get(Course, course_id)
    if not course or course.deleted_at is not None or not course.is_published:
        raise LookupError("Course not found")
    existing = (
        db.session.query(CourseEnrollment)
        .filter_by(course_id=course_id, student_id=student_id)
        .first()
    )
    if existing:
        raise ValueError("Already enrolled in this course")
    enrollment = CourseEnrollment(course_id=course_id, student_id=student_id)
    db.session.add(enrollment)
    db.session.commit()
    return {
        "id": enrollment.id,
        "course_id": enrollment.course_id,
        "student_id": enrollment.student_id,
        "enrolled_at": enrollment.enrolled_at.isoformat(),
    }


def publish_course(course_id: int, teacher_id: int) -> dict:
    """
    Set is_published = True.
    Raises LookupError if course not found or soft-deleted.
    Raises PermissionError if teacher_id does not own the course.
    Raises ValueError if course has no lessons.
    """
    course = db.session.get(Course, course_id)
    if not course or course.deleted_at is not None:
        raise LookupError("Course not found")
    if course.teacher_id != teacher_id:
        raise PermissionError("You do not own this course")

    lesson_count = db.session.query(Lesson).filter_by(course_id=course_id).count()
    if lesson_count == 0:
        raise ValueError("Course must have at least one lesson before publishing")

    course.is_published = True
    course.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return _course_to_dict(course)


def unpublish_course(course_id: int, teacher_id: int) -> dict:
    """
    Set is_published = False.
    Raises LookupError if course not found or soft-deleted.
    Raises PermissionError if teacher_id does not own the course.
    """
    course = db.session.get(Course, course_id)
    if not course or course.deleted_at is not None:
        raise LookupError("Course not found")
    if course.teacher_id != teacher_id:
        raise PermissionError("You do not own this course")

    course.is_published = False
    course.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return _course_to_dict(course)


def get_course_lessons(course_id: int) -> list[dict]:
    """Return ordered lessons for a course."""
    lessons = (
        db.session.query(Lesson)
        .filter_by(course_id=course_id)
        .order_by(Lesson.order)
        .all()
    )
    return [
        {
            "id": l.id,
            "course_id": l.course_id,
            "title": l.title,
            "content": l.content,
            "order": l.order,
            "created_at": l.created_at.isoformat(),
            "updated_at": l.updated_at.isoformat(),
        }
        for l in lessons
    ]


def get_lesson_by_id(lesson_id: int, course_id: int) -> dict | None:
    """Return a single lesson by ID if it belongs to the course."""
    lesson = (
        db.session.query(Lesson).filter_by(id=lesson_id, course_id=course_id).first()
    )
    if not lesson:
        return None
    return {
        "id": lesson.id,
        "course_id": lesson.course_id,
        "title": lesson.title,
        "content": lesson.content,
        "order": lesson.order,
        "created_at": lesson.created_at.isoformat(),
        "updated_at": lesson.updated_at.isoformat(),
    }
