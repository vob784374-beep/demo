import os
import json
import click
import bcrypt
from flask import Flask, current_app
from app.extensions import db


def seed_db_logic():
    """Seed database with test data. Called by both CLI and auto-seed."""
    import bcrypt
    from app.models.user import User, Role, UserRole
    from app.models.course import Course
    from app.models.lesson import Lesson
    from app.services.permission_service import sync_permissions_from_enum

    from app.extensions import db

    # Roles
    roles = {}
    for name in ("student", "teacher", "admin"):
        role = db.session.execute(
            db.select(Role).filter_by(name=name)
        ).scalar_one_or_none()
        if not role:
            role = Role(name=name)
            db.session.add(role)
        roles[name] = role
    db.session.flush()

    # Sync permissions from enum (creates missing ones)
    sync_permissions_from_enum()

    # Assign default permissions to built-in roles
    from app.middleware.permissions import RolePermission
    from app.models.permission import (
        Permission as PermissionModel,
        RolePermission as RolePermissionModel,
    )

    for role_name, allowed_perms in [
        ("admin", RolePermission.ADMIN),
        ("teacher", RolePermission.TEACHER),
        ("student", RolePermission.STUDENT),
    ]:
        role = roles[role_name]
        # Clear existing role_permission assignments for built-in roles to re-sync
        RolePermissionModel.query.filter_by(role_id=role.id).delete()

        for perm_enum in allowed_perms:
            # Use the enum value as the permission name string
            permission_name = perm_enum.value
            perm_db = PermissionModel.query.filter_by(name=permission_name).first()
            if perm_db:
                assignment = RolePermissionModel(
                    role_id=role.id, permission_id=perm_db.id
                )
                db.session.add(assignment)
            else:
                # This shouldn't happen since we just synced, but log if it does
                current_app.logger.warning(
                    f"Permission {permission_name} not found in DB after sync"
                )

    db.session.flush()

    # Sync permissions from enum (creates missing ones)
    sync_permissions_from_enum()

    # Assign default permissions to built-in roles
    # For admin, teacher, student - ensure role_permission assignments exist
    # This sets up the default permissions for the three built-in roles
    from app.middleware.permissions import RolePermission
    from app.models.permission import (
        Permission as PermissionModel,
        RolePermission as RolePermissionModel,
    )

    for role_name, allowed_perms in [
        ("admin", RolePermission.ADMIN),
        ("teacher", RolePermission.TEACHER),
        ("student", RolePermission.STUDENT),
    ]:
        role = roles[role_name]
        # Clear existing role_permission assignments for built-in roles to re-sync
        RolePermissionModel.query.filter_by(role_id=role.id).delete()

        for perm_enum in allowed_perms:
            perm_db = PermissionModel.query.filter_by(name=perm_enum.value).first()
            if perm_db:
                assignment = RolePermissionModel(
                    role_id=role.id, permission_id=perm_db.id
                )
                db.session.add(assignment)

    db.session.flush()

    # Users
    users_spec = [
        ("student@test.com", "Student", "Test", "student"),
        ("teacher@test.com", "Teacher", "Test", "teacher"),
        ("admin@test.com", "Admin", "Test", "admin"),
    ]
    created = {}
    for email, first_name, last_name, role_name in users_spec:
        user = db.session.execute(
            db.select(User).filter_by(email=email)
        ).scalar_one_or_none()
        if not user:
            pw_hash = bcrypt.hashpw("Test1234!".encode(), bcrypt.gensalt()).decode()
            user = User(
                email=email,
                password_hash=pw_hash,
                first_name=first_name,
                last_name=last_name,
            )
            db.session.add(user)
        created[role_name] = user
    db.session.flush()

    # User-role assignments
    for role_name, user in created.items():
        role = roles[role_name]
        exists = db.session.execute(
            db.select(UserRole).filter_by(user_id=user.id, role_id=role.id)
        ).scalar_one_or_none()
        if not exists:
            db.session.add(UserRole(user_id=user.id, role_id=role.id))
    db.session.flush()

    # Courses + lessons
    teacher = created["teacher"]
    courses_spec = [
        (
            1,
            "English Pronunciation Master",
            "Learn standard British and American pronunciation. Improve accent and speaking confidence with detailed pronunciation exercises.",
            "Pronunciation Course",
            True,
        ),
        (
            2,
            "Vocabulary to Speak English Fluently",
            "Build 2000+ everyday vocabulary words for confident communication in any situation.",
            "Vocabulary to Speak",
            True,
        ),
        (
            3,
            "Grammar to Speak English",
            "Master grammar from basic to advanced for fluent English speaking and writing.",
            "Grammar to Speak",
            True,
        ),
        (
            4,
            "Essential Writing Skills",
            "Learn to write emails, essays, letters, and common documents for work and study.",
            "Essential Writing",
            True,
        ),
        (
            5,
            "IELTS Writing Preparation",
            "Strategies and techniques to achieve band 7.0+ in IELTS Writing Task 1 and Task 2.",
            "IELTS Writing",
            True,
        ),
        (
            6,
            "IELTS Speaking Master",
            "Practice IELTS Speaking with interview strategies, cue cards, and advanced part 3.",
            "IELTS Speaking",
            True,
        ),
    ]
    for course_id, title, description, category, is_published in courses_spec:
        course = db.session.execute(
            db.select(Course).filter_by(id=course_id)
        ).scalar_one_or_none()
        if not course:
            course = Course(
                id=course_id,
                teacher_id=teacher.id,
                title=title,
                description=description,
                category=category,
                is_published=is_published,
            )
            db.session.add(course)
            db.session.flush()
            db.session.add(
                Lesson(
                    course_id=course.id,
                    title=f"Introduction to {title}",
                    content="Welcome to this course! Your teacher will add content here.",
                    order=1,
                )
            )

    db.session.commit()


def register_commands(app: Flask, smorest_api=None):
    @app.cli.command("seed-db")
    def seed_db():
        """Populate database with test data (dev/test environments only)."""
        env = os.environ.get("APP_ENV", "development")
        if env not in ("development", "testing"):
            click.echo(
                f"❌ seed-db is only allowed in development/testing environments (current: {env}). Aborting."
            )
            return

        seed_db_logic()
        click.echo("✅ Database seeded.")
        click.echo("   Users: student@test.com / teacher@test.com / admin@test.com")
        click.echo("   Password: Test1234!")
        click.echo("   Courses: 6 sample courses with lessons")
        click.echo("   Permissions: synced from enum to database")

    @app.cli.command("sync-permissions")
    def sync_permissions():
        """Sync permission definitions from Permission enum to database."""
        from app.services.permission_service import sync_permissions_from_enum

        env = os.environ.get("APP_ENV", "development")
        if env not in ("development", "testing"):
            click.echo(
                f"❌ sync-permissions is only allowed in development/testing environments (current: {env}). Aborting."
            )
            return

        try:
            created = sync_permissions_from_enum()
            click.echo(f"✅ Permissions synced. Created {created} new permission(s).")
            if created > 0:
                click.echo(
                    "   Run 'flask set-role-permissions' to assign them to roles."
                )
        except Exception as exc:
            click.echo(f"❌ Sync failed: {exc}")
            raise SystemExit(1)

    @app.cli.command("set-role-permissions")
    def set_role_permissions_cli():
        """Assign default permissions to built-in roles (admin, teacher, student)."""
        from app.models.user import Role
        from app.models.permission import (
            Permission as PermissionModel,
            RolePermission as RolePermissionModel,
        )
        from app.middleware.permissions import RolePermission

        env = os.environ.get("APP_ENV", "development")
        if env not in ("development", "testing"):
            click.echo(
                f"❌ set-role-permissions is only allowed in development/testing environments (current: {env}). Aborting."
            )
            return

        try:
            # Ensure all enum permissions exist in DB
            from app.services.permission_service import sync_permissions_from_enum

            sync_permissions_from_enum()

            for role_name, allowed_perms in [
                ("admin", RolePermission.ADMIN),
                ("teacher", RolePermission.TEACHER),
                ("student", RolePermission.STUDENT),
            ]:
                role = db.session.execute(
                    db.select(Role).filter_by(name=role_name)
                ).scalar_one_or_none()
                if not role:
                    click.echo(f"⚠️  Role '{role_name}' not found, creating...")
                    role = Role(name=role_name)
                    db.session.add(role)
                    db.session.flush()

                # Clear existing
                RolePermissionModel.query.filter_by(role_id=role.id).delete()

                # Assign new
                count = 0
                for perm_enum in allowed_perms:
                    perm_db = db.session.execute(
                        db.select(PermissionModel).filter_by(name=perm_enum.value)
                    ).scalar_one_or_none()
                    if perm_db:
                        assignment = RolePermissionModel(
                            role_id=role.id, permission_id=perm_db.id
                        )
                        db.session.add(assignment)
                        count += 1
                    else:
                        click.echo(f"  ⚠️  Permission {perm_enum.value} not found in DB")

                click.echo(f"✅ Set {count} permissions for role '{role_name}'")

            db.session.commit()
            click.echo("✅ All role permissions configured.")
        except Exception as exc:
            db.session.rollback()
            click.echo(f"❌ Failed: {exc}")
            raise SystemExit(1)
        from app.models.user import User, Role, UserRole
        from app.models.course import Course
        from app.models.lesson import Lesson

        try:
            # Roles
            roles = {}
            for name in ("student", "teacher", "admin"):
                role = db.session.execute(
                    db.select(Role).filter_by(name=name)
                ).scalar_one_or_none()
                if not role:
                    role = Role(name=name)
                    db.session.add(role)
                roles[name] = role
            db.session.flush()

            # Users
            users_spec = [
                ("student@test.com", "Student", "Test", "student"),
                ("teacher@test.com", "Teacher", "Test", "teacher"),
                ("admin@test.com", "Admin", "Test", "admin"),
            ]
            created = {}
            for email, first_name, last_name, role_name in users_spec:
                user = db.session.execute(
                    db.select(User).filter_by(email=email)
                ).scalar_one_or_none()
                if not user:
                    pw_hash = bcrypt.hashpw(
                        "Test1234!".encode(), bcrypt.gensalt()
                    ).decode()
                    user = User(
                        email=email,
                        password_hash=pw_hash,
                        first_name=first_name,
                        last_name=last_name,
                    )
                    db.session.add(user)
                created[role_name] = user
            db.session.flush()

            # User-role assignments
            for role_name, user in created.items():
                role = roles[role_name]
                exists = db.session.execute(
                    db.select(UserRole).filter_by(user_id=user.id, role_id=role.id)
                ).scalar_one_or_none()
                if not exists:
                    db.session.add(UserRole(user_id=user.id, role_id=role.id))
            db.session.flush()

            # Courses + lessons
            teacher = created["teacher"]
            courses_spec = [
                (
                    1,
                    "English Pronunciation Master",
                    "Learn standard British and American pronunciation. Improve accent and speaking confidence with detailed pronunciation exercises.",
                    "Pronunciation Course",
                    True,
                ),
                (
                    2,
                    "Vocabulary to Speak English Fluently",
                    "Build 2000+ everyday vocabulary words for confident communication in any situation.",
                    "Vocabulary to Speak",
                    True,
                ),
                (
                    3,
                    "Grammar to Speak English",
                    "Master grammar from basic to advanced for fluent English speaking and writing.",
                    "Grammar to Speak",
                    True,
                ),
                (
                    4,
                    "Essential Writing Skills",
                    "Learn to write emails, essays, letters, and common documents for work and study.",
                    "Essential Writing",
                    True,
                ),
                (
                    5,
                    "IELTS Writing Preparation",
                    "Strategies and techniques to achieve band 7.0+ in IELTS Writing Task 1 and Task 2.",
                    "IELTS Writing",
                    True,
                ),
                (
                    6,
                    "IELTS Speaking Master",
                    "Practice IELTS Speaking with interview strategies, cue cards, and advanced part 3.",
                    "IELTS Speaking",
                    True,
                ),
            ]
            for course_id, title, description, category, is_published in courses_spec:
                course = db.session.execute(
                    db.select(Course).filter_by(id=course_id)
                ).scalar_one_or_none()
                if not course:
                    course = Course(
                        id=course_id,
                        teacher_id=teacher.id,
                        title=title,
                        description=description,
                        category=category,
                        is_published=is_published,
                    )
                    db.session.add(course)
                    db.session.flush()
                    db.session.add(
                        Lesson(
                            course_id=course.id,
                            title=f"Introduction to {title}",
                            content="Welcome to this course! Your teacher will add content here.",
                            order=1,
                        )
                    )

            db.session.commit()
            click.echo("✅ Database seeded.")
            click.echo("   Users: student@test.com / teacher@test.com / admin@test.com")
            click.echo("   Password: Test1234!")
            click.echo("   Courses: 6 sample courses with lessons")
        except Exception as exc:
            db.session.rollback()
            click.echo(f"❌ Seed failed, transaction rolled back: {exc}")
            raise SystemExit(1)

    if smorest_api is not None:

        @app.cli.command("spec-dump")
        @click.option(
            "--format",
            "fmt",
            default="json",
            type=click.Choice(["json", "yaml"]),
            help="Output format (default: json)",
        )
        @click.option(
            "--output",
            "-o",
            default="-",
            help="Output file path, or - for stdout (default)",
        )
        def spec_dump(fmt, output):
            """Export the OpenAPI spec to JSON or YAML."""
            import yaml as _yaml

            spec_dict = smorest_api.spec.to_dict()

            if fmt == "yaml":
                content = _yaml.dump(spec_dict, sort_keys=False, allow_unicode=True)
            else:
                content = json.dumps(spec_dict, indent=2, ensure_ascii=False)

            if output == "-":
                click.echo(content)
            else:
                with open(output, "w", encoding="utf-8") as fh:
                    fh.write(content)
                click.echo(f"✅ Spec written to {output}")
