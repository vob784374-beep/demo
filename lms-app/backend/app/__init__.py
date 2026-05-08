import os
import structlog
from flask import Flask
from flask_smorest import Api
from .config import config_map
from .extensions import db, migrate, jwt, cors, limiter, cache
from .logging_config import configure_logging
from .middleware.request_context import register_request_context
from .middleware.request_logger import register_request_logger
from .middleware.error_handlers import register_error_handlers
from .middleware.response_envelope_validator import register_response_envelope_validator
from .commands import register_commands


def create_app(config_name: str = None) -> Flask:
    app = Flask(__name__)

    env = config_name or os.environ.get("APP_ENV", "development")
    app.config.from_object(config_map[env])
    app.config["APP_ENV"] = env

    if env in ("staging", "production") and not app.config.get("RATELIMIT_STORAGE_URI"):
        raise RuntimeError(
            f"RATELIMIT_STORAGE_URI (REDIS_URL) must be set in {env} environment"
        )

    configure_logging(app)

    logger = structlog.get_logger("lms.startup")
    logger.info("application started", env=env, log_dir=app.config.get("LOG_DIR"))

    db.init_app(app)

    # Auto-seed in development if no courses exist
    if env in ("development", "testing"):
        with app.app_context():
            # Check if tables exist before querying
            from sqlalchemy import inspect

            inspector = inspect(db.engine)
            if inspector.has_table("courses"):
                from app.models.course import Course

                course_count = (
                    db.session.query(Course).filter_by(deleted_at=None).count()
                )
                if course_count == 0:
                    logger.info("no courses found, running auto-seed")
                    from app.commands import seed_db_logic

                    try:
                        seed_db_logic()
                        logger.info("auto-seed completed successfully")
                    except Exception as e:
                        logger.warning("auto-seed failed", error=str(e))
            else:
                logger.info("courses table does not exist yet, skipping auto-seed")
    migrate.init_app(app, db)
    jwt.init_app(app)
    cache.init_app(app)

    from .utils import jwt_utils
    from .utils.responses import unauthorized_response
    from .constants.messages import AuthMessage

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        return jwt_utils.is_blocklisted(jwt_payload["jti"])

    @jwt.token_verification_loader
    def bind_user_id_to_log_context(jwt_header, jwt_payload):
        """Bind user_id to structlog contextvars the moment a JWT is verified.

        This runs before any route logic, so every subsequent log statement
        within the request automatically carries user_id — including logs
        from service layer, business logic, and error handlers.
        """
        uid = jwt_payload.get("sub")
        if uid is not None:
            structlog.contextvars.bind_contextvars(user_id=str(uid))
        return True

    jwt.unauthorized_loader(lambda reason: unauthorized_response(reason))
    jwt.invalid_token_loader(lambda reason: unauthorized_response(reason))
    jwt.revoked_token_loader(
        lambda _h, _p: unauthorized_response(AuthMessage.TOKEN_REVOKED)
    )

    # Allow override via CORS_ORIGINS env var, but default to frontend URL in development
    if app.config.get("CORS_ORIGINS"):
        raw = app.config["CORS_ORIGINS"]
        cors_origins = (
            [o.strip() for o in raw.split(",") if o.strip()]
            if raw != "*"
            else ["http://localhost:3000", "http://127.0.0.1:3000"]
        )
    else:
        cors_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

    cors.init_app(
        app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True
    )

    limiter.init_app(app)

    from . import models  # noqa: F401

    # Wire slow-query / debug-SQL logging after engine is available
    with app.app_context():
        from .logging.db import register_db_logger

        register_db_logger(db, debug_sql=app.config.get("DEBUG_SQL", False))

    # Init smorest BEFORE our error handlers so ours take precedence
    smorest_api = Api(app)
    app.extensions["smorest"] = smorest_api

    # Register shared envelope schemas in the spec components
    from .api.v1.schemas.responses import (
        SuccessEnvelopeSchema,
        ErrorEnvelopeSchema,
        PaginationMetaSchema,
    )

    with app.app_context():
        smorest_api.spec.components.schema(
            "PaginationMeta", schema=PaginationMetaSchema
        )
        smorest_api.spec.components.schema(
            "SuccessEnvelope", schema=SuccessEnvelopeSchema
        )
        smorest_api.spec.components.schema("ErrorEnvelope", schema=ErrorEnvelopeSchema)

    register_request_context(app)
    register_request_logger(app)
    register_error_handlers(app)

    # Enable in dev and testing so envelope violations surface early
    if env in ("development", "testing"):
        app.config.setdefault("VALIDATE_RESPONSE_ENVELOPE", True)
    register_response_envelope_validator(app)

    @app.route("/api/v1/health")
    def health():
        from .utils.responses import success_response

        return success_response({"status": "ok"})

    register_commands(app, smorest_api)

    from .api.v1 import register_blueprints

    register_blueprints(smorest_api)

    return app
