from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_smorest import Blueprint
from marshmallow import ValidationError
from app.extensions import cache
from app.middleware.rbac import require_role
from app.services import course_service
from app.utils.responses import (
    success_response,
    paginated_response,
    flatten_validation_messages,
    validation_error_response,
    forbidden_response,
    error_response,
)
from .schemas import CreateCourseSchema, UpdateCourseSchema

courses_bp = Blueprint("courses", __name__, url_prefix="/api/v1/courses")

_MAX_PER_PAGE = 100


@courses_bp.route("", methods=["GET"])
@courses_bp.doc(
    summary="List published courses",
    description="Paginated public catalog of all published courses. No authentication required.",
    responses={
        200: {"description": "Paginated list with meta (page, per_page, total)"},
        422: {"description": "Invalid page or per_page parameter"},
    },
)
@cache.cached(timeout=300, query_string=True)
def list_courses():
    try:
        page = int(request.args.get("page", 1))
        per_page = min(int(request.args.get("per_page", 20)), _MAX_PER_PAGE)
    except (ValueError, TypeError):
        return validation_error_response("page and per_page must be positive integers")
    if page < 1 or per_page < 1:
        return validation_error_response("page and per_page must be positive integers")

    result = course_service.list_published_courses(page, per_page)
    return paginated_response(
        result["items"], result["page"], result["per_page"], result["total"]
    )


@courses_bp.route("", methods=["POST"])
@courses_bp.doc(
    summary="Create a course",
    description="Creates a new unpublished course owned by the authenticated teacher.",
    security=[{"BearerAuth": []}],
    responses={
        201: {"description": "Course created"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Caller is not a teacher or admin"},
        422: {"description": "Validation error — title required"},
    },
)
@require_role("teacher", "admin")
def create_course():
    try:
        data = CreateCourseSchema().load(request.get_json() or {})
    except ValidationError as err:
        return validation_error_response(flatten_validation_messages(err.messages))

    teacher_id = int(get_jwt_identity())
    course = course_service.create_course(teacher_id=teacher_id, **data)
    return success_response(course, 201)


@courses_bp.route("/<int:course_id>", methods=["GET"])
@courses_bp.doc(
    summary="Get a course",
    description=(
        "Returns a published course for any caller. "
        "Authenticated course owners can also retrieve their own unpublished courses."
    ),
    responses={
        200: {
            "description": "Course data (published courses include lesson_count and teacher_name)"
        },
        404: {"description": "Course not found or not published"},
    },
)
@jwt_required(optional=True)
def get_course(course_id: int):
    identity = get_jwt_identity()
    if identity:
        course = course_service.get_course_for_teacher(course_id, int(identity))
        if course:
            return success_response(course)
    student_id = int(identity) if identity else None
    course = course_service.get_published_course(course_id, student_id=student_id)
    if not course:
        return error_response("NOT_FOUND", "Not Found", "Course not found", 404)
    return success_response(course)


@courses_bp.route("/<int:course_id>", methods=["PATCH"])
@courses_bp.doc(
    summary="Update a course",
    description="Partially updates a course. Only the owner teacher or an admin may update.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "Updated course data"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Caller is not the owner"},
        404: {"description": "Course not found"},
        422: {"description": "Validation error or empty body"},
    },
)
@require_role("teacher", "admin")
def update_course(course_id: int):
    try:
        data = UpdateCourseSchema().load(request.get_json() or {})
    except ValidationError as err:
        return validation_error_response(flatten_validation_messages(err.messages))

    if not data:
        return validation_error_response("No updatable fields provided")

    teacher_id = int(get_jwt_identity())
    try:
        course = course_service.update_course(course_id, teacher_id, data)
    except LookupError:
        return error_response("NOT_FOUND", "Not Found", "Course not found", 404)
    except PermissionError as err:
        return forbidden_response(str(err))

    return success_response(course)


@courses_bp.route("/<int:course_id>", methods=["DELETE"])
@courses_bp.doc(
    summary="Delete a course",
    description="Soft-deletes a course. Blocked if the course has active enrollments.",
    security=[{"BearerAuth": []}],
    responses={
        204: {"description": "Course deleted"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Caller is not the owner"},
        404: {"description": "Course not found"},
        422: {"description": "Course has active enrollments"},
    },
)
@require_role("teacher", "admin")
def delete_course(course_id: int):
    teacher_id = int(get_jwt_identity())
    try:
        course_service.delete_course(course_id, teacher_id)
    except LookupError:
        return error_response("NOT_FOUND", "Not Found", "Course not found", 404)
    except PermissionError as err:
        return forbidden_response(str(err))
    except ValueError as err:
        return validation_error_response(str(err))

    return "", 204


@courses_bp.route("/<int:course_id>/publish", methods=["POST"])
@courses_bp.doc(
    summary="Publish a course",
    description="Marks a course as published. The course must have at least one lesson.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "Course is now published"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Caller is not the owner"},
        404: {"description": "Course not found"},
        422: {"description": "Course has no lessons"},
    },
)
@require_role("teacher", "admin")
def publish_course(course_id: int):
    teacher_id = int(get_jwt_identity())
    try:
        course = course_service.publish_course(course_id, teacher_id)
    except LookupError:
        return error_response("NOT_FOUND", "Not Found", "Course not found", 404)
    except PermissionError as err:
        return forbidden_response(str(err))
    except ValueError as err:
        return validation_error_response(str(err))
    return success_response(course)


@courses_bp.route("/<int:course_id>/unpublish", methods=["POST"])
@courses_bp.doc(
    summary="Unpublish a course",
    description="Marks a course as unpublished. Idempotent — safe to call on already-unpublished courses.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "Course is now unpublished"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Caller is not the owner"},
        404: {"description": "Course not found"},
    },
)
@require_role("teacher", "admin")
def unpublish_course(course_id: int):
    teacher_id = int(get_jwt_identity())
    try:
        course = course_service.unpublish_course(course_id, teacher_id)
    except LookupError:
        return error_response("NOT_FOUND", "Not Found", "Course not found", 404)
    except PermissionError as err:
        return forbidden_response(str(err))
    return success_response(course)


@courses_bp.route("/<int:course_id>/enroll", methods=["POST"])
@courses_bp.doc(
    summary="Enroll in a course",
    description="Enrolls the authenticated student in a published course.",
    security=[{"BearerAuth": []}],
    responses={
        201: {"description": "Enrollment created"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Caller is not a student"},
        404: {"description": "Course not found or not published"},
        422: {"description": "Already enrolled in this course"},
    },
)
@require_role("student")
def enroll_course(course_id: int):
    student_id = int(get_jwt_identity())
    try:
        enrollment = course_service.enroll_student(course_id, student_id)
    except LookupError:
        return error_response("NOT_FOUND", "Not Found", "Course not found", 404)
    except ValueError as err:
        return validation_error_response(str(err))
    return success_response(enrollment, 201)


@courses_bp.route("/<int:course_id>/lessons", methods=["GET"])
@courses_bp.doc(
    summary="Get course lessons",
    description="Returns ordered lessons for a course.",
    responses={
        200: {"description": "List of lessons"},
        404: {"description": "Course not found or not published"},
    },
)
@jwt_required(optional=True)
def get_course_lessons(course_id: int):
    course = course_service.get_published_course(course_id)
    if not course:
        return error_response("NOT_FOUND", "Not Found", "Course not found", 404)
    lessons = course_service.get_course_lessons(course_id)
    return success_response(lessons)


@courses_bp.route("/<int:course_id>/lessons/<int:lesson_id>", methods=["GET"])
@courses_bp.doc(
    summary="Get a lesson",
    description="Returns a single lesson from a course.",
    responses={
        200: {"description": "Lesson data"},
        404: {"description": "Course or lesson not found"},
    },
)
@jwt_required(optional=True)
def get_lesson(course_id: int, lesson_id: int):
    course = course_service.get_published_course(course_id)
    if not course:
        return error_response("NOT_FOUND", "Not Found", "Course not found", 404)
    lesson = course_service.get_lesson_by_id(lesson_id, course_id)
    if not lesson:
        return error_response("NOT_FOUND", "Not Found", "Lesson not found", 404)
    return success_response(lesson)
