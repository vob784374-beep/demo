"""
Permission database models for RBAC system.
These models store permission definitions and role-permission assignments.
"""

from datetime import datetime, timezone
from app.extensions import db


class Permission(db.Model):
    """Individual permission that can be assigned to roles."""

    __tablename__ = "permissions"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    category = db.Column(db.String(50), nullable=False, index=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Backref from RolePermission will give us role_assignments
    # We don't define direct roles relationship to avoid overlap with association object

    def add(self, name: str, description: str = None, category: str = "general"):
        """Create and add a new permission to the database."""
        permission = Permission(name=name, description=description, category=category)
        db.session.add(permission)
        db.session.commit()
        return permission

    @classmethod
    def create(cls, name: str, description: str = None, category: str = "general"):
        """Create a new permission (class method)."""
        permission = cls(name=name, description=description, category=category)
        db.session.add(permission)
        db.session.commit()
        return permission

    def __repr__(self):
        return f"<Permission {self.name}>"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RolePermission(db.Model):
    """Association table for role-permission many-to-many relationship."""

    __tablename__ = "role_permissions"

    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), primary_key=True)
    permission_id = db.Column(
        db.Integer, db.ForeignKey("permissions.id"), primary_key=True
    )
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    role = db.relationship("Role", back_populates="permission_assignments")
    permission = db.relationship(
        "Permission", backref=db.backref("role_assignments", lazy="dynamic")
    )

    def __repr__(self):
        return f"<RolePermission role={self.role_id} permission={self.permission_id}>"
