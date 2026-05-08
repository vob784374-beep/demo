"""Permission management schemas for API v1."""

from marshmallow import Schema, fields, validate


class PermissionCreateSchema(Schema):
    """Schema for creating a new permission."""

    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(allow_none=True, validate=validate.Length(max=500))
    category = fields.String(required=True, validate=validate.Length(min=1, max=50))


class PermissionSchema(Schema):
    """Schema for permission details."""

    id = fields.Integer(dump_only=True)
    name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    description = fields.String(allow_none=True, validate=validate.Length(max=500))
    category = fields.String(required=True, validate=validate.Length(min=1, max=50))
    created_at = fields.DateTime(dump_only=True)


class PermissionListSchema(Schema):
    """Schema for listing permissions with category grouping."""

    category = fields.String(required=True)
    permissions = fields.List(fields.Nested(PermissionSchema), required=True)


class RolePermissionsSchema(Schema):
    """Schema for role permission assignments."""

    role = fields.String(required=True, validate=validate.Length(min=1, max=50))
    permissions = fields.List(
        fields.String(required=True), required=True, validate=validate.Length(min=0)
    )


class RoleWithPermissionsSchema(Schema):
    """Schema for role with its permissions."""

    id = fields.Integer(dump_only=True)
    name = fields.String(required=True)
    description = fields.String(allow_none=True)
    permissions = fields.List(fields.Nested(PermissionSchema), dump_only=True)
    user_count = fields.Integer(
        dump_only=True, metadata={"description": "Number of users with this role"}
    )


class BulkPermissionUpdateSchema(Schema):
    """Schema for bulk permission updates."""

    permissions = fields.List(
        fields.String(required=True), required=True, validate=validate.Length(min=0)
    )


class RoleCreateSchema(Schema):
    """Schema for creating a new role."""

    name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    description = fields.String(allow_none=True, validate=validate.Length(max=200))
