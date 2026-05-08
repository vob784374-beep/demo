def register_blueprints(api):
    from app.api.v1.auth.routes import auth_bp
    from app.api.v1.courses.routes import courses_bp
    from app.api.v1.users.routes import users_bp
    from app.api.v1.permissions.routes import permissions_bp
    from app.api.v1.roles.routes import roles_bp

    api.register_blueprint(auth_bp)
    api.register_blueprint(courses_bp)
    api.register_blueprint(users_bp)
    api.register_blueprint(permissions_bp)
    api.register_blueprint(roles_bp)
