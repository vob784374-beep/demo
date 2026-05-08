from marshmallow import Schema, fields, validate, validates, ValidationError, EXCLUDE
from app.constants.messages import PasswordMessage


class RegisterSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True)
    first_name = fields.String(required=True, validate=validate.Length(min=1, max=100))
    last_name = fields.String(required=True, validate=validate.Length(min=1, max=100))

    @validates("password")
    def validate_password(self, value, **kwargs):
        if len(value) < 8:
            raise ValidationError(PasswordMessage.TOO_SHORT)
        if len(value.encode("utf-8")) > 72:
            raise ValidationError(PasswordMessage.TOO_LONG)


class LoginSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True)
