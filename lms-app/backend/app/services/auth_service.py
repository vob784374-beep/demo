import bcrypt
from sqlalchemy.exc import IntegrityError
from app.extensions import db
from app.models.user import User, Role, UserRole
from app.constants.messages import AuthMessage

# Generated once at startup — valid bcrypt hash that never matches any real password.
# Ensures constant-time response whether or not the email exists (timing attack mitigation).
_DUMMY_HASH = bcrypt.hashpw(b"__dummy_sentinel__", bcrypt.gensalt()).decode("utf-8")


def register_user(email: str, password: str, first_name: str, last_name: str) -> dict:
    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode(
        "utf-8"
    )

    role = Role.query.filter_by(name="student").first()
    if not role:
        try:
            role = Role(name="student")
            db.session.add(role)
            db.session.flush()
        except IntegrityError:
            db.session.rollback()
            role = Role.query.filter_by(name="student").first()

    user = User(
        email=email,
        password_hash=password_hash,
        first_name=first_name,
        last_name=last_name,
    )
    db.session.add(user)

    try:
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        raise ValueError(AuthMessage.EMAIL_ALREADY_REGISTERED)

    user_role = UserRole(user_id=user.id, role_id=role.id)
    db.session.add(user_role)
    db.session.commit()

    return {"id": user.id, "email": user.email, "role": "student"}


def login_user(email: str, password: str) -> dict:
    user = User.query.filter_by(email=email).first()

    stored_hash = user.password_hash if user else _DUMMY_HASH
    password_matches = bcrypt.checkpw(
        password.encode("utf-8"), stored_hash.encode("utf-8")
    )

    if not user or not password_matches or not user.is_active:
        raise ValueError(AuthMessage.INVALID_CREDENTIALS)

    role = user.roles.first()
    return {
        "id": user.id,
        "email": user.email,
        "role": role.name if role else "student",
    }
