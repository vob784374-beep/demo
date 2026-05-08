"""
Shared response envelope schemas registered in the OpenAPI spec components.

These are documentation schemas only — runtime serialization is handled by
success_response() / error_response() in app.utils.responses.
"""

from marshmallow import Schema, fields


class PaginationMetaSchema(Schema):
    page = fields.Int(metadata={"example": 1})
    per_page = fields.Int(metadata={"example": 20})
    total = fields.Int(metadata={"example": 42})


class SuccessEnvelopeSchema(Schema):
    success = fields.Bool(metadata={"example": True})
    code = fields.Str(metadata={"example": "OK"})
    message = fields.Str(metadata={"example": "Success"})
    data = fields.Raw(
        allow_none=True,
        metadata={"description": "Response payload — shape varies by endpoint"},
    )
    meta = fields.Nested(
        PaginationMetaSchema,
        allow_none=True,
        metadata={"description": "Pagination metadata (list endpoints only)"},
    )
    request_id = fields.Str(
        allow_none=True, metadata={"example": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}
    )


class ErrorEnvelopeSchema(Schema):
    success = fields.Bool(metadata={"example": False})
    code = fields.Str(
        metadata={
            "example": "VALIDATION_ERROR",
            "enum": [
                "VALIDATION_ERROR",
                "UNAUTHORIZED",
                "FORBIDDEN",
                "NOT_FOUND",
                "INTERNAL_ERROR",
            ],
        },
    )
    message = fields.Str(metadata={"example": "email: Not a valid email address"})
    data = fields.Raw(allow_none=True, load_default=None)
    meta = fields.Raw(allow_none=True, load_default=None)
    request_id = fields.Str(allow_none=True)
