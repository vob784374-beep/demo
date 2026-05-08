import os

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # backend/


def _openapi_spec_options(server_url: str, server_desc: str) -> dict:
    return {
        'info': {'description': 'Learning Management System REST API'},
        'servers': [{'url': server_url, 'description': server_desc}],
        'components': {
            'securitySchemes': {
                'BearerAuth': {
                    'type': 'http',
                    'scheme': 'bearer',
                    'bearerFormat': 'JWT',
                    'description': 'Access token returned on login/register/refresh',
                },
                'RefreshCookie': {
                    'type': 'apiKey',
                    'in': 'cookie',
                    'name': 'refresh_token_cookie',
                    'description': 'HttpOnly refresh token set on login/register',
                },
            },
        },
    }


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret')
    JWT_ACCESS_TOKEN_EXPIRES = 900        # 15 minutes
    JWT_REFRESH_TOKEN_EXPIRES = 604800    # 7 days
    # Refresh token delivered as HttpOnly cookie; access token in response body only
    JWT_COOKIE_SECURE = False             # overridden to True in staging/production
    JWT_COOKIE_SAMESITE = 'Strict'
    JWT_COOKIE_CSRF_PROTECT = False       # SameSite=Strict prevents CSRF without extra tokens
    JWT_REFRESH_COOKIE_PATH = '/api/v1/auth'  # cookie only sent to /auth/* endpoints
    SQLALCHEMY_POOL_SIZE = 10
    SQLALCHEMY_MAX_OVERFLOW = 20
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL', 'memory://')
    RATELIMIT_DEFAULT_LIMITS = ['100 per minute']
    # OpenAPI / Swagger UI
    API_TITLE = 'LMS API'
    API_VERSION = 'v1'
    OPENAPI_VERSION = '3.1.0'
    OPENAPI_URL_PREFIX = '/api'
    OPENAPI_SWAGGER_UI_PATH = '/docs'
    OPENAPI_SWAGGER_UI_URL = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist/'
    OPENAPI_JSON_PATH = 'openapi.json'


class DevelopmentConfig(Config):
    DEBUG = True
    LOG_LEVEL = 'DEBUG'
    LOG_DIR = os.path.join(_BASE_DIR, 'logs')  # backend/logs/ — always active in dev
    DEBUG_SQL = True
    CACHE_TYPE = 'SimpleCache'
    CACHE_DEFAULT_TIMEOUT = 300
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://lms_user:lms_password@localhost:3306/lms_db'
    )
    API_SPEC_OPTIONS = _openapi_spec_options('http://localhost:5000', 'Development server')


class StagingConfig(Config):
    DEBUG = False
    JWT_COOKIE_SECURE = True
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_DIR = os.environ.get('LOG_DIR')
    CACHE_TYPE = 'RedisCache'
    CACHE_REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT = 300
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL')
    API_SPEC_OPTIONS = _openapi_spec_options(
        os.environ.get('APP_URL', 'https://staging.lms.example.com'),
        'Staging server',
    )


class ProductionConfig(Config):
    DEBUG = False
    JWT_COOKIE_SECURE = True
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_DIR = os.environ.get('LOG_DIR', '/var/log/lms')
    CACHE_TYPE = 'RedisCache'
    CACHE_REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CACHE_DEFAULT_TIMEOUT = 300
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '')
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL')
    API_SPEC_OPTIONS = _openapi_spec_options(
        os.environ.get('APP_URL', 'https://lms.example.com'),
        'Production server',
    )


class TestingConfig(Config):
    TESTING = True
    LOG_LEVEL = 'WARNING'
    DEBUG_SQL = False
    CACHE_TYPE = 'NullCache'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    RATELIMIT_STORAGE_URI = 'memory://'
    SQLALCHEMY_POOL_SIZE = None
    SQLALCHEMY_MAX_OVERFLOW = None


config_map = {
    'development': DevelopmentConfig,
    'staging': StagingConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}
