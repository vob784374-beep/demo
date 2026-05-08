"""Role management schemas for API v1."""

from marshmallow import Schema, fields, validate


class RoleCreateSchema(Schema):
    """Schema for creating a new role."""

    name = fields.String(required=True, validate=validate.Length(min=1, max=50))
    description = fields.String(allow_none=True, validate=validate.Length(max=200))
