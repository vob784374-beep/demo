"""Role management API routes."""

from flask import request
from flask_smorest import Blueprint
from app.extensions import db
from app.models.user import Role
from app.utils.responses import success_response, error_response
from .schemas import RoleCreateSchema
from app.api.v1.permissions.schemas import RoleWithPermissionsSchema
from app.middleware.auth_middleware import require_auth
from app.middleware.permissions import require_permission, Permission as PermissionEnum

roles_bp = Blueprint(
    "roles",
    __name__,
    url_prefix="/api/v1/roles",
    description="Role management endpoints for RBAC system",
)


@roles_bp.route("", methods=["POST"])
@require_auth
@require_permission(PermissionEnum.SYSTEM_SETTINGS_UPDATE)
def create_role():
    """Create a new role."""
    data = RoleCreateSchema().load(request.get_json() or {})

    existing = Role.query.filter_by(name=data["name"]).first()
    if existing:
        return error_response("Role already exists", 409)

    role = Role(
        name=data["name"],
        description=data.get("description"),
    )
    db.session.add(role)
    db.session.commit()

    return success_response(
        {
            "id": role.id,
            "name": role.name,
            "description": role.description,
        },
        status_code=201,
    )
