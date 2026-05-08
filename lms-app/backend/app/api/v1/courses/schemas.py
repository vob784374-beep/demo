from marshmallow import Schema, fields, validate, EXCLUDE


class CreateCourseSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    title = fields.String(
        required=True,
        validate=validate.Length(min=1, max=255, error='Title must be between 1 and 255 characters'),
    )
    description = fields.String(load_default=None)
    category = fields.String(
        load_default=None,
        validate=validate.Length(max=100, error='Category must be 100 characters or fewer'),
    )


class UpdateCourseSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    title = fields.String(
        validate=validate.Length(min=1, max=255, error='Title must be between 1 and 255 characters'),
    )
    description = fields.String()
    category = fields.String(
        validate=validate.Length(max=100, error='Category must be 100 characters or fewer'),
    )
