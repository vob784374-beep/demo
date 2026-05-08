"""
Permission service layer.
Handles permission CRUD, role-permission assignments, and sync with Permission enum.
"""

from typing import Optional, List, Set
from flask import current_app
from app.extensions import db
from app.models.permission import Permission, RolePermission
from app.models.user import Role
from app.middleware.permissions import (
    Permission as PermissionEnum,
    get_role_permissions as get_hardcoded_permissions,
)


def get_all_permissions(include_hardcoded_only: bool = False) -> List[Permission]:
    """Get all permissions from database.

    Args:
        include_hardcoded_only: If True, also include permissions that exist in enum but not in DB

    Returns:
        List of Permission objects
    """
    query = Permission.query.order_by(Permission.category, Permission.name)
    permissions = query.all()

    if include_hardcoded_only:
        # Add any enum permissions that are missing from DB
        existing_names = {p.name for p in permissions}
        missing = [p for p in PermissionEnum if p.value not in existing_names]

        for perm_enum in missing:
            # Create a pseudo-permission object (not persisted)
            perm = Permission()
            perm.id = None
            perm.name = perm_enum.value
            perm.description = f"Auto-generated: {perm_enum.name}"
            perm.category = _categorize_permission(perm_enum)
            permissions.append(perm)

    return permissions


def get_permissions_by_category() -> dict:
    """Group permissions by category for UI display.

    Returns:
        Dict mapping category name to list of permission dicts
    """
    permissions = get_all_permissions(include_hardcoded_only=True)
    categories = {}

    for perm in permissions:
        cat = perm.category or "Other"
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(
            perm.to_dict()
            if hasattr(perm, "to_dict")
            else {
                "id": perm.id,
                "name": perm.name,
                "description": perm.description,
                "category": perm.category,
            }
        )

    return categories


def get_role_permissions(role_name: str) -> Set[Permission]:
    """Get permission set for a role (from DB, fallback to hardcoded).

    Args:
        role_name: Role name (admin, teacher, student)

    Returns:
        Set of Permission enum members
    """
    # Try database first
    role = Role.query.filter_by(name=role_name).first()
    if role:
        db_perms = set()
        for perm_assignment in role.permission_assignments:
            perm = perm_assignment.permission
            # Convert to enum if possible
            try:
                enum_perm = PermissionEnum(perm.name)
                db_perms.add(enum_perm)
            except ValueError:
                # Permission in DB doesn't match enum - skip
                current_app.logger.warning(f"Unknown permission in DB: {perm.name}")
        return db_perms

    # Fallback to hardcoded
    return get_hardcoded_permissions(role_name)


def has_permission(role_name: str, permission: PermissionEnum) -> bool:
    """Check if a role has a specific permission.

    Args:
        role_name: Role name
        permission: Permission enum to check

    Returns:
        True if role has permission
    """
    return permission in get_role_permissions(role_name)


def assign_permission_to_role(role_name: str, permission_name: str) -> bool:
    """Assign a permission to a role.

    Args:
        role_name: Role name
        permission_name: Permission name (string value like "user:list")

    Returns:
        True if assigned, False if already assigned or error
    """
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        current_app.logger.error(f"Role not found: {role_name}")
        return False

    perm = Permission.query.filter_by(name=permission_name).first()
    if not perm:
        current_app.logger.error(f"Permission not found: {permission_name}")
        return False

    # Check if already assigned
    existing = RolePermission.query.filter_by(
        role_id=role.id, permission_id=perm.id
    ).first()
    if existing:
        return False

    assignment = RolePermission(role_id=role.id, permission_id=perm.id)
    db.session.add(assignment)
    db.session.commit()

    current_app.logger.info(
        f"Assigned permission {permission_name} to role {role_name}"
    )
    return True


def remove_permission_from_role(role_name: str, permission_name: str) -> bool:
    """Remove a permission from a role.

    Args:
        role_name: Role name
        permission_name: Permission name

    Returns:
        True if removed, False if not found
    """
    role = Role.query.filter_by(name=role_name).first()
    perm = Permission.query.filter_by(name=permission_name).first()

    if not role or not perm:
        return False

    assignment = RolePermission.query.filter_by(
        role_id=role.id, permission_id=perm.id
    ).first()
    if not assignment:
        return False

    db.session.delete(assignment)
    db.session.commit()

    current_app.logger.info(
        f"Removed permission {permission_name} from role {role_name}"
    )
    return True


def set_role_permissions(role_name: str, permission_names: List[str]) -> None:
    """Set the complete permission set for a role (replaces existing).

    Args:
        role_name: Role name
        permission_names: List of permission names to assign
    """
    role = Role.query.filter_by(name=role_name).first()
    if not role:
        raise ValueError(f"Role not found: {role_name}")

    # Clear existing assignments
    RolePermission.query.filter_by(role_id=role.id).delete()

    # Add new assignments
    for perm_name in permission_names:
        perm = Permission.query.filter_by(name=perm_name).first()
        if perm:
            assignment = RolePermission(role_id=role.id, permission_id=perm.id)
            db.session.add(assignment)

    db.session.commit()
    current_app.logger.info(
        f"Set {len(permission_names)} permissions for role {role_name}"
    )


def sync_permissions_from_enum() -> int:
    """Sync permission definitions from Permission enum to database.

    Creates any missing permissions in the database based on the enum.
    Should be run at startup or via admin command.

    Returns:
        Number of permissions created
    """
    created = 0
    for perm_enum in PermissionEnum:
        existing = Permission.query.filter_by(name=perm_enum.value).first()
        if not existing:
            category = _categorize_permission(perm_enum)
            perm = Permission(
                name=perm_enum.value,
                description=f"Auto-created from enum: {perm_enum.name}",
                category=category,
            )
            db.session.add(perm)
            created += 1

    if created > 0:
        db.session.commit()
        current_app.logger.info(f"Synced {created} permissions from enum to database")

    return created


def _categorize_permission(perm_enum: PermissionEnum) -> str:
    """Categorize a permission enum value for UI grouping.

    Args:
        perm_enum: Permission enum member

    Returns:
        Category string (User Management, Course Management, etc.)
    """
    name = perm_enum.name

    category_map = {
        "USER": "User Management",
        "COURSE": "Course Management",
        "LESSON": "Lesson Management",
        "ENROLLMENT": "Enrollment",
        "PROGRESS": "Progress Tracking",
        "EXERCISE": "Exercises",
        "ASSESSMENT": "Assessments",
        "MEDIA": "Media",
        "DASHBOARD": "Dashboard & Analytics",
        "SYSTEM": "System",
    }

    for key, category in category_map.items():
        if name.startswith(key):
            return category

    return "Other"
