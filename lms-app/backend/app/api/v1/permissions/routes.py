"""Permission management API routes."""

from flask import request
from flask_smorest import Blueprint
from app.extensions import db
from app.models.permission import Permission, RolePermission as RolePermissionModel
from app.models.user import Role, UserRole
from app.middleware.permissions import (
    require_permission,
    Permission as PermissionEnum,
    get_role_permissions,
)
from app.middleware.rbac import require_role
from app.services.permission_service import (
    get_all_permissions,
    get_permissions_by_category,
    get_role_permissions as get_role_permissions_service,
    assign_permission_to_role,
    remove_permission_from_role,
    set_role_permissions,
    sync_permissions_from_enum,
)
from app.utils.responses import success_response, error_response, paginated_response
from .schemas import (
    PermissionSchema,
    PermissionListSchema,
    RoleWithPermissionsSchema,
    RolePermissionsSchema,
    BulkPermissionUpdateSchema,
    PermissionCreateSchema,
    RoleCreateSchema,
)
from ..roles.schemas import RoleCreateSchema

permissions_bp = Blueprint(
    "permissions",
    __name__,
    url_prefix="/api/v1/permissions",
    description="Permission management endpoints for RBAC system",
)


@permissions_bp.route("/all", methods=["GET"])
@permissions_bp.doc(
    summary="List all permissions",
    description="Get all available permissions grouped by category. Admin only.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "List of permissions grouped by category"},
        403: {"description": "Admin access required"},
    },
)
@require_permission(PermissionEnum.SYSTEM_SETTINGS_VIEW)
def list_all_permissions():
    """List all permissions grouped by category."""
    categories = get_permissions_by_category()
    return success_response({"categories": categories})


@permissions_bp.route("/flat", methods=["GET"])
@permissions_bp.doc(
    summary="List all permissions (flat list)",
    description="Get a flat list of all permissions. Admin only.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "Flat list of permissions"},
        403: {"description": "Admin access required"},
    },
)
@require_permission(PermissionEnum.SYSTEM_SETTINGS_VIEW)
def list_permissions_flat():
    """Get all permissions as flat list."""
    permissions = get_all_permissions(include_hardcoded_only=True)
    result = []
    for perm in permissions:
        result.append(
            {
                "id": perm.id,
                "name": perm.name,
                "description": perm.description,
                "category": perm.category,
            }
        )
    return success_response({"permissions": result})


@permissions_bp.route("/roles", methods=["GET"])
@permissions_bp.doc(
    summary="List roles with permissions and user counts",
    description="Get all roles with their permissions and associated user counts. Admin only.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "List of roles with permissions"},
        403: {"description": "Admin access required"},
    },
)
@require_permission(PermissionEnum.SYSTEM_SETTINGS_VIEW)
def list_roles_with_permissions():
    """List all roles with permissions and user counts."""
    roles = Role.query.all()
    result = []
    for role in roles:
        perms = [
            {
                "id": perm.permission.id,
                "name": perm.permission.name,
                "description": perm.permission.description,
                "category": perm.permission.category,
            }
            for perm in role.permission_assignments
        ]
        result.append(
            {
                "id": role.id,
                "name": role.name,
                "description": role.description,
                "permissions": perms,
                "user_count": db.session.query(UserRole)
                .filter_by(role_id=role.id)
                .count(),
                "created_at": role.created_at.isoformat() if role.created_at else None,
            }
        )
    return success_response({"roles": result})


@permissions_bp.route("", methods=["POST"])
@permissions_bp.doc(
    summary="Create a new permission",
    description="Create a new permission. Admin only.",
    security=[{"BearerAuth": []}],
    responses={
        201: {"description": "Permission created successfully"},
        400: {"description": "Validation error"},
        403: {"description": "Admin access required"},
        409: {"description": "Permission already exists"},
    },
)
@require_permission(PermissionEnum.SYSTEM_SETTINGS_UPDATE)
def create_permission():
    """Create a new permission."""
    data = PermissionCreateSchema().load(request.get_json() or {})

    existing = Permission.query.filter_by(name=data["name"]).first()
    if existing:
        return error_response("Permission already exists", 409)

    permission = Permission(
        name=data["name"],
        description=data["description"],
        category=data["category"],
    )
    db.session.add(permission)
    db.session.commit()

    return success_response(
        {
            "id": permission.id,
            "name": permission.name,
            "description": permission.description,
            "category": permission.category,
        },
        status_code=201,
    )


@permissions_bp.route("/sync", methods=["POST"])
@permissions_bp.doc(
    summary="Sync permissions from enum",
    description="Create missing permissions in database from Permission enum. Admin only.",
    security=[{"BearerAuth": []}],
    responses={
        200: {"description": "Sync result"},
        403: {"description": "Admin access required"},
    },
)
@require_permission(PermissionEnum.SYSTEM_SETTINGS_UPDATE)
def sync_permissions():
    """Sync permissions from enum to database."""
    try:
        created = sync_permissions_from_enum()
        return success_response(
            {"message": "Permissions synced successfully", "created": created}
        )
    except Exception as e:
        return error_response("SYNC_ERROR", str(e), 500)
