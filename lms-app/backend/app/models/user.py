from datetime import datetime, timezone
from werkzeug.security import generate_password_hash
from app.extensions import db


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (db.Index("idx_users_email", "email", unique=True),)

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    roles = db.relationship(
        "Role",
        secondary="user_roles",
        lazy="dynamic",
        backref=db.backref("users", lazy="dynamic"),
    )
    courses_teaching = db.relationship(
        "Course", foreign_keys="Course.teacher_id", backref="teacher", lazy="dynamic"
    )
    enrollments = db.relationship(
        "CourseEnrollment",
        foreign_keys="CourseEnrollment.student_id",
        backref="student",
        lazy="dynamic",
    )

    def add(
        self,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        is_active: bool = True,
    ):
        """Create and add a new user to the database."""
        password_hash = generate_password_hash(password)
        user = User(
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            is_active=is_active,
        )
        db.session.add(user)
        db.session.commit()
        return user

    @classmethod
    def create(
        cls,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        is_active: bool = True,
    ):
        """Create a new user (class method)."""
        password_hash = generate_password_hash(password)
        user = cls(
            email=email,
            password_hash=password_hash,
            first_name=first_name,
            last_name=last_name,
            is_active=is_active,
        )
        db.session.add(user)
        db.session.commit()
        return user


class Role(db.Model):
    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Association to RolePermission entries (association object pattern)
    permission_assignments = db.relationship(
        "RolePermission",
        back_populates="role",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def add(self, name: str, description: str = None):
        """Create and add a new role to the database."""
        role = Role(name=name, description=description)
        db.session.add(role)
        db.session.commit()
        return role

    @classmethod
    def create(cls, name: str, description: str = None):
        """Create a new role (class method)."""
        role = cls(name=name, description=description)
        db.session.add(role)
        db.session.commit()
        return role


class UserRole(db.Model):
    __tablename__ = "user_roles"

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey("roles.id"), primary_key=True)
