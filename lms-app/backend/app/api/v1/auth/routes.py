from flask import request, current_app
from flask_jwt_extended import jwt_required
from flask_smorest import Blueprint
from marshmallow import ValidationError
from app.extensions import db, limiter
from app.models.user import User
from app.services import auth_service, jwt_service
from app.utils import jwt_utils
from app.utils.responses import (
    flatten_validation_messages,
    validation_error_response,
    unauthorized_response,
    make_cookie_response,
    set_success_body,
)
from app.constants.messages import AuthMessage
from app.logging.security import (
    log_auth_success,
    log_auth_failure,
    log_register_success,
    log_token_revoked,
)
from .schemas import RegisterSchema, LoginSchema

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")


def _client_ip() -> str:
    fwd = request.headers.get("X-Forwarded-For")
    return fwd.split(",")[0].strip() if fwd else (request.remote_addr or "unknown")


@auth_bp.route("/register", methods=["POST"])
@auth_bp.doc(
    summary="Register a new user",
    description=(
        "Creates a student account. Returns an access token in the body "
        "and sets an HttpOnly refresh token cookie."
    ),
    responses={
        201: {
            "description": "Registration successful — access token in body, refresh cookie set"
        },
        422: {
            "description": "Validation error — missing/invalid fields or duplicate email"
        },
    },
)
@limiter.limit("10 per minute")
def register():
    try:
        data = RegisterSchema().load(request.get_json() or {})
    except ValidationError as err:
        return validation_error_response(flatten_validation_messages(err.messages))

    try:
        result = auth_service.register_user(**data)
    except ValueError as err:
        return validation_error_response(str(err))

    log_register_success(user_id=result["id"], email=data["email"], ip=_client_ip())

    user = db.session.get(User, result["id"])
    response = make_cookie_response(201)
    response, access_token = jwt_service.attach_tokens(response, user)
    set_success_body(response, {**result, "access_token": access_token})
    return response


@auth_bp.route("/login", methods=["POST"])
@auth_bp.doc(
    summary="Log in",
    description=(
        "Authenticates with email and password. Returns an access token in the body "
        "and sets an HttpOnly refresh token cookie.\n\n"
        "**Request body (JSON):**\n"
        "```json\n"
        '{"email": "student@test.com", "password": "Test1234!"}\n'
        "```"
    ),
    responses={
        200: {"description": "Login successful — access token and user data in body"},
        401: {"description": "Invalid credentials"},
        422: {"description": "Validation error"},
    },
)
@auth_bp.arguments(LoginSchema)
@limiter.limit("20 per minute")
def login(data):
    try:
        result = auth_service.login_user(**data)
    except ValueError:
        log_auth_failure(
            email=data.get("email", ""), ip=_client_ip(), reason="invalid_credentials"
        )
        return unauthorized_response(AuthMessage.INVALID_CREDENTIALS)

    log_auth_success(user_id=result["id"], email=data["email"], ip=_client_ip())

    user = db.session.get(User, result["id"])
    response = make_cookie_response(200)
    response, access_token = jwt_service.attach_tokens(response, user)
    set_success_body(response, {"access_token": access_token, "user": result})
    return response


@auth_bp.route("/refresh", methods=["POST"])
@auth_bp.doc(
    summary="Rotate tokens",
    description=(
        "Exchanges the refresh cookie for a new access token and rotated refresh cookie. "
        "The old refresh token JTI is blocklisted immediately."
    ),
    security=[{"RefreshCookie": []}],
    responses={
        200: {"description": "New access token issued, new refresh cookie set"},
        401: {"description": "Missing, invalid, or revoked refresh token"},
    },
)
@jwt_required(refresh=True, locations=["cookies"])
@limiter.limit("20 per minute")
def refresh():
    user_id = jwt_service.get_current_user_id()
    old_jti = jwt_utils.current_jti()
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return unauthorized_response(AuthMessage.INACTIVE_USER)
    refresh_ttl = current_app.config["JWT_REFRESH_TOKEN_EXPIRES"]
    response = make_cookie_response(200)
    response, access_token = jwt_service.rotate_tokens(
        response, user, old_jti, refresh_ttl
    )
    set_success_body(response, {"access_token": access_token})
    return response


@auth_bp.route("/logout", methods=["POST"])
@auth_bp.doc(
    summary="Log out",
    description="Revokes the refresh token and clears the refresh cookie.",
    security=[{"RefreshCookie": []}],
    responses={
        200: {"description": "Logged out — refresh cookie cleared"},
        401: {"description": "Missing or invalid refresh token"},
    },
)
@jwt_required(refresh=True, locations=["cookies"])
@limiter.limit("20 per minute")
def logout():
    jti = jwt_utils.current_jti()
    user_id = jwt_service.get_current_user_id()
    refresh_ttl = current_app.config["JWT_REFRESH_TOKEN_EXPIRES"]
    jwt_service.revoke_current_token(jti, refresh_ttl)
    log_token_revoked(user_id=str(user_id))
    response = make_cookie_response(200)
    jwt_utils.clear_auth_cookies(response)
    return response
