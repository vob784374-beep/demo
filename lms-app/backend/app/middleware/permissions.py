"""
Permission system for LMS application.

Production-ready permission design with:
- Role-based access control (RBAC) - coarse-grained
- Permission-based access control (PBAC) - fine-grained
- Resource ownership checks
- Audit logging
"""

from enum import Enum
from functools import wraps
from flask import request, current_app
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity
from app.utils.responses import forbidden_response, error_response
from app.logging.security import log_permission_denied
from app.extensions import db


class Permission(Enum):
    """
    Fine-grained permissions for the LMS system.
    Each permission maps to specific actions on resources.
    """

    # User management
    USER_LIST = "user:list"
    USER_VIEW = "user:view"
    USER_CREATE = "user:create"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_ACTIVATE = "user:activate"
    USER_DEACTIVATE = "user:deactivate"
    USER_CHANGE_ROLE = "user:change_role"

    # Course management
    COURSE_LIST = "course:list"
    COURSE_VIEW = "course:view"
    COURSE_CREATE = "course:create"
    COURSE_UPDATE = "course:update"
    COURSE_DELETE = "course:delete"
    COURSE_PUBLISH = "course:publish"
    COURSE_UNPUBLISH = "course:unpublish"

    # Lesson management
    LESSON_LIST = "lesson:list"
    LESSON_VIEW = "lesson:view"
    LESSON_CREATE = "lesson:create"
    LESSON_UPDATE = "lesson:update"
    LESSON_DELETE = "lesson:delete"

    # Enrollment
    ENROLLMENT_LIST = "enrollment:list"
    ENROLLMENT_CREATE = "enrollment:create"
    ENROLLMENT_VIEW = "enrollment:view"

    # Progress tracking
    PROGRESS_VIEW_OWN = "progress:view_own"
    PROGRESS_VIEW_STUDENT = "progress:view_student"
    PROGRESS_UPDATE = "progress:update"

    # Exercises
    EXERCISE_LIST = "exercise:list"
    EXERCISE_VIEW = "exercise:view"
    EXERCISE_CREATE = "exercise:create"
    EXERCISE_UPDATE = "exercise:update"
    EXERCISE_DELETE = "exercise:delete"
    EXERCISE_SUBMIT = "exercise:submit"

    # Assessments
    ASSESSMENT_LIST = "assessment:list"
    ASSESSMENT_VIEW = "assessment:view"
    ASSESSMENT_CREATE = "assessment:create"
    ASSESSMENT_UPDATE = "assessment:update"
    ASSESSMENT_DELETE = "assessment:delete"
    ASSESSMENT_SUBMIT = "assessment:submit"
    ASSESSMENT_GRADE = "assessment:grade"

    # Media
    MEDIA_UPLOAD = "media:upload"
    MEDIA_VIEW = "media:view"
    MEDIA_DELETE = "media:delete"

    # Dashboard/Analytics
    DASHBOARD_VIEW_OWN = "dashboard:view_own"
    DASHBOARD_VIEW_STUDENTS = "dashboard:view_students"
    DASHBOARD_VIEW_TEACHERS = "dashboard:view_teachers"
    DASHBOARD_VIEW_ADMIN = "dashboard:view_admin"

    # System
    SYSTEM_SETTINGS_VIEW = "system:settings:view"
    SYSTEM_SETTINGS_UPDATE = "system:settings:update"


# Hardcoded permission sets as fallback
class RolePermission:
    """Maps roles to their allowed permissions (hardcoded fallback)."""

    # Admin has all permissions
    ADMIN = set(Permission)

    # Teacher permissions - can manage own content
    TEACHER = {
        # Dashboard
        Permission.DASHBOARD_VIEW_OWN,
        Permission.DASHBOARD_VIEW_STUDENTS,
        # Courses - own only
        Permission.COURSE_LIST,
        Permission.COURSE_VIEW,
        Permission.COURSE_CREATE,
        Permission.COURSE_UPDATE,
        Permission.COURSE_DELETE,
        Permission.COURSE_PUBLISH,
        Permission.COURSE_UNPUBLISH,
        # Lessons - for own courses
        Permission.LESSON_LIST,
        Permission.LESSON_VIEW,
        Permission.LESSON_CREATE,
        Permission.LESSON_UPDATE,
        Permission.LESSON_DELETE,
        # Exercises
        Permission.EXERCISE_LIST,
        Permission.EXERCISE_VIEW,
        Permission.EXERCISE_CREATE,
        Permission.EXERCISE_UPDATE,
        Permission.EXERCISE_DELETE,
        # Assessments
        Permission.ASSESSMENT_LIST,
        Permission.ASSESSMENT_VIEW,
        Permission.ASSESSMENT_CREATE,
        Permission.ASSESSMENT_UPDATE,
        Permission.ASSESSMENT_DELETE,
        Permission.ASSESSMENT_GRADE,
        # Media
        Permission.MEDIA_UPLOAD,
        Permission.MEDIA_VIEW,
        Permission.MEDIA_DELETE,
        # Enrollment - view own course enrollments
        Permission.ENROLLMENT_LIST,
        Permission.ENROLLMENT_VIEW,
        # Progress - view students in own courses
        Permission.PROGRESS_VIEW_STUDENT,
    }

    # Student permissions - limited to enrolled content
    STUDENT = {
        # Dashboard
        Permission.DASHBOARD_VIEW_OWN,
        # Courses - view published
        Permission.COURSE_LIST,
        Permission.COURSE_VIEW,
        # Enrollment
        Permission.ENROLLMENT_CREATE,
        # Lessons - enrolled courses
        Permission.LESSON_LIST,
        Permission.LESSON_VIEW,
        # Progress - own
        Permission.PROGRESS_VIEW_OWN,
        Permission.PROGRESS_UPDATE,
        # Exercises - submit
        Permission.EXERCISE_LIST,
        Permission.EXERCISE_VIEW,
        Permission.EXERCISE_SUBMIT,
        # Assessments - submit
        Permission.ASSESSMENT_LIST,
        Permission.ASSESSMENT_VIEW,
        Permission.ASSESSMENT_SUBMIT,
        # Media - view
        Permission.MEDIA_VIEW,
    }


def get_role_permissions(role: str) -> set:
    """
    Get permission set for a role.
    Checks database first, falls back to hardcoded set.

    Args:
        role: Role name (student, teacher, admin)

    Returns:
        Set of permissions for the role
    """
    try:
        # Try database lookup
        from app.models.user import Role as RoleModel
        from app.models.permission import Permission as PermissionModel

        role_record = RoleModel.query.filter_by(name=role.lower()).first()
        if role_record:
            db_perms = set()
            for perm_assignment in role_record.permission_assignments:
                perm_db = perm_assignment.permission
                try:
                    # Convert DB permission to enum
                    enum_perm = Permission(perm_db.name)
                    db_perms.add(enum_perm)
                except ValueError:
                    # Unknown permission in DB, skip
                    if current_app:
                        current_app.logger.warning(
                            f"Unknown permission in DB: {perm_db.name}"
                        )
            # If role exists but has no permissions, fall back to hardcoded
            if not db_perms:
                pass  # Fall through to hardcoded below
            else:
                return db_perms
    except Exception as e:
        # If DB query fails, fall back to hardcoded
        if current_app:
            current_app.logger.debug(f"DB lookup failed for role {role}: {e}")

    # Fallback to hardcoded
    mapping = {
        "admin": RolePermission.ADMIN,
        "teacher": RolePermission.TEACHER,
        "student": RolePermission.STUDENT,
    }
    return mapping.get(role.lower(), set())


def has_permission(role: str, permission: Permission) -> bool:
    """
    Check if a role has a specific permission.

    Args:
        role: Role name
        permission: Permission to check

    Returns:
        True if role has permission
    """
    return permission in get_role_permissions(role)


def require_permission(*permissions: Permission):
    """
    Decorator to require specific permissions.

    Usage:
        @require_permission(Permission.USER_CREATE, Permission.USER_UPDATE)
        def create_user():
            ...

    Args:
        *permissions: Required permissions (any one grants access)
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role", "").lower()
            user_id = str(get_jwt_identity() or "unknown")

            # Check if user has any of the required permissions
            user_permissions = get_role_permissions(user_role)

            if not any(perm in user_permissions for perm in permissions):
                log_permission_denied(
                    user_id=user_id,
                    path=request.path,
                    required_roles=[p.value for p in permissions],
                )
                return forbidden_response(
                    f"Permission denied: requires {', '.join(p.value for p in permissions)}"
                )

            return fn(*args, **kwargs)

        return wrapper

    return decorator


def require_owner_or_role(resource_owner_id, *permissions: Permission):
    """
    Decorator for resource-level permission check.
    Allows access if:
    1. User has required permission (role-based), OR
    2. User owns the resource (resource owner)

    Usage:
        @require_owner_or_role(
            lambda: get_course_teacher_id(course_id),
            Permission.COURSE_UPDATE,
            Permission.COURSE_DELETE
        )
        def update_course(course_id):
            ...

    Args:
        resource_owner_id: Callable returning owner user ID, or direct ID
        *permissions: Fallback permissions if not owner
    """

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_id = get_jwt_identity()
            user_role = claims.get("role", "").lower()

            # Get owner ID (support both callable and direct value)
            owner_id = (
                resource_owner_id()
                if callable(resource_owner_id)
                else resource_owner_id
            )

            # Check ownership
            is_owner = user_id == owner_id

            # Check permissions
            user_permissions = get_role_permissions(user_role)
            has_perm = any(perm in user_permissions for perm in permissions)

            # Grant access if owner OR has permission
            if not (is_owner or has_perm):
                log_permission_denied(
                    user_id=str(user_id),
                    path=request.path,
                    required_roles=[p.value for p in permissions],
                )
                return forbidden_response(
                    "Permission denied: resource owner or required permission needed"
                )

            return fn(*args, **kwargs)

        return wrapper

    return decorator


# Backward compatibility - keep existing require_role working
def require_role(*roles: str):
    """
    Legacy decorator - wraps new permission system.
    Supports both old role-based and new permission-based checks.
    """
    if not roles:
        raise ValueError("require_role requires at least one role argument")

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role", "").lower()

            if user_role not in [r.lower() for r in roles]:
                user_id = str(get_jwt_identity() or "unknown")
                log_permission_denied(
                    user_id=user_id,
                    path=request.path,
                    required_roles=list(roles),
                )
                return forbidden_response("Insufficient role")
            return fn(*args, **kwargs)

        return wrapper

    return decorator
