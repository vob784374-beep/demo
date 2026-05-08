from datetime import datetime, timezone
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_smorest import Blueprint
from marshmallow import Schema, fields, validate, EXCLUDE
from app.extensions import db
from app.models.user import User, Role, UserRole
from app.middleware import require_role, Permission, require_permission
from app.utils import jwt_utils
from app.utils.responses import (
    success_response,
    error_response,
    validation_error_response,
)
from app.logging.security import log_permission_denied


users_bp = Blueprint("users", __name__, url_prefix="/api/v1/users")


class UserCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True)
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    role = fields.Str(
        validate=validate.OneOf(["student", "teacher", "admin"]), load_default="student"
    )
    is_active = fields.Bool(load_default=True)


class UserResponseSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    id = fields.Int(dump_only=True)
    email = fields.Email(required=True)
    first_name = fields.Str(required=True)
    last_name = fields.Str(required=True)
    is_active = fields.Bool()
    role = fields.Str()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class UserUpdateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    role = fields.Str(validate=validate.OneOf(["student", "teacher", "admin"]))
    is_active = fields.Bool()


class PaginatedUserResponse(Schema):
    data = fields.List(fields.Nested(UserResponseSchema))
    meta = fields.Dict()


user_response_schema = UserResponseSchema()
users_response_schema = PaginatedUserResponse()
user_update_schema = UserUpdateSchema()
user_create_schema = UserCreateSchema()


@users_bp.route("", methods=["POST"])
@users_bp.doc(
    summary="Create a new user",
    description="Admin endpoint to create a new user account.",
    security=[{"BearerAuth": []}],
    responses={
        201: {"description": "User created successfully"},
        400: {"description": "Validation error"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Forbidden - admin role required"},
        409: {"description": "Email already exists"},
    },
)
@require_role("admin")
def create_user():
    """Create a new user."""
    data = user_create_schema.load(request.get_json() or {})

    existing = User.query.filter_by(email=data["email"]).first()
    if existing:
        return error_response("Email already exists", 409)

    user = User.create(
        email=data["email"],
        password=data["password"],
        first_name=data["first_name"],
        last_name=data["last_name"],
        is_active=data.get("is_active", True),
    )

    role_name = data.get("role", "student")
    user_role = Role.query.filter_by(name=role_name).first()
    if user_role:
        user_role_assignment = UserRole(user_id=user.id, role_id=user_role.id)
        db.session.add(user_role_assignment)
        db.session.commit()

    return success_response(
        {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active,
            "role": role_name,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        status_code=201,
    )


@users_bp.route("", methods=["GET"])
@users_bp.doc(
    summary="List all users",
    description="Admin endpoint to list all users with pagination.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "List of users"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Forbidden - admin role required"},
    },
)
@require_role("admin")
def list_users():
    """List all users with pagination."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 100)
    search = request.args.get("search", "", type=str)

    query = db.session.query(User)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.email.ilike(search_filter))
            | (User.first_name.ilike(search_filter))
            | (User.last_name.ilike(search_filter))
        )

    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    users_data = []
    for user in pagination.items:
        user_roles = [ur.name for ur in user.roles.all()]
        users_data.append(
            {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_active": user.is_active,
                "role": user_roles[0] if user_roles else "student",
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            }
        )

    return success_response(
        {
            "users": users_data,
            "meta": {
                "page": pagination.page,
                "per_page": pagination.per_page,
                "total": pagination.total,
                "pages": pagination.pages,
            },
        }
    )


@users_bp.route("/<int:user_id>", methods=["GET"])
@users_bp.doc(
    summary="Get user by ID",
    description="Get detailed user information.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "User details"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Forbidden"},
        404: {"description": "User not found"},
    },
)
@require_role("admin")
def get_user(user_id: int):
    """Get a specific user by ID."""
    user = db.session.get(User, user_id)
    if not user:
        return error_response("NOT_FOUND", "Not Found", "User not found", 404)

    user_roles = [ur.name for ur in user.roles.all()]

    user_data = {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_active": user.is_active,
        "role": user_roles[0] if user_roles else "student",
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }

    return success_response(user_data)


@users_bp.route("/<int:user_id>", methods=["PATCH"])
@users_bp.doc(
    summary="Update user",
    description="Update user role or active status. Admin only.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "User updated successfully"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Forbidden - admin role required"},
        404: {"description": "User not found"},
        422: {"description": "Validation error"},
    },
)
@require_role("admin")
def update_user(user_id: int):
    """Update user role or active status."""
    user = db.session.get(User, user_id)
    if not user:
        return error_response("NOT_FOUND", "Not Found", "User not found", 404)

    current_admin_id = get_jwt_identity()
    if user_id == current_admin_id:
        return error_response(
            "FORBIDDEN", "Forbidden", "Cannot modify your own account", 403
        )

    data = user_update_schema.load(request.get_json() or {})

    if "role" in data:
        new_role_name = data["role"]
        role = db.session.query(Role).filter_by(name=new_role_name).first()
        if not role:
            return validation_error_response({"role": "Invalid role"})

        user.roles.clear()
        user.roles.append(role)

    if "is_active" in data:
        user.is_active = data["is_active"]

    user.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    user_roles = [ur.name for ur in user.roles.all()]
    return success_response(
        {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "is_active": user.is_active,
            "role": user_roles[0] if user_roles else "student",
            "updated_at": user.updated_at.isoformat(),
        }
    )


@users_bp.route("/stats", methods=["GET"])
@users_bp.doc(
    summary="Get user statistics",
    description="Get system-wide user statistics for admin dashboard.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "User statistics"},
        401: {"description": "Missing or invalid access token"},
        403: {"description": "Forbidden - admin role required"},
    },
)
@require_role("admin")
def get_user_stats():
    """Get user statistics for admin dashboard."""
    from app.models.course import Course, CourseEnrollment

    total_users = db.session.query(User).count()
    active_users = db.session.query(User).filter_by(is_active=True).count()

    student_role = db.session.query(Role).filter_by(name="student").first()
    teacher_role = db.session.query(Role).filter_by(name="teacher").first()
    admin_role = db.session.query(Role).filter_by(name="admin").first()

    student_count = (
        db.session.query(UserRole).filter_by(role_id=student_role.id).count()
        if student_role
        else 0
    )
    teacher_count = (
        db.session.query(UserRole).filter_by(role_id=teacher_role.id).count()
        if teacher_role
        else 0
    )
    admin_count = (
        db.session.query(UserRole).filter_by(role_id=admin_role.id).count()
        if admin_role
        else 0
    )

    total_courses = db.session.query(Course).filter_by(is_published=True).count()
    total_enrollments = db.session.query(CourseEnrollment).count()

    thirty_days_ago = datetime.now(timezone.utc).timestamp() - (30 * 24 * 60 * 60)
    active_last_30_days = (
        db.session.query(User)
        .filter(
            User.updated_at >= datetime.fromtimestamp(thirty_days_ago, tz=timezone.utc)
        )
        .count()
    )

    return success_response(
        {
            "total_users": total_users,
            "active_users": active_users,
            "student_count": student_count,
            "teacher_count": teacher_count,
            "admin_count": admin_count,
            "total_courses": total_courses,
            "total_enrollments": total_enrollments,
            "active_last_30_days": active_last_30_days,
        }
    )
