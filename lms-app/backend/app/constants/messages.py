class AuthMessage:
    INVALID_CREDENTIALS = 'Invalid credentials'
    EMAIL_ALREADY_REGISTERED = 'Email already registered'
    INACTIVE_USER = 'Invalid or inactive user'
    TOKEN_REVOKED = 'Token has been revoked'
    INSUFFICIENT_ROLE = 'Insufficient role'


class PasswordMessage:
    TOO_SHORT = 'Password must be at least 8 characters'
    TOO_LONG = 'Password must be 72 bytes or fewer'


class ServerMessage:
    UNEXPECTED_ERROR = 'An unexpected error occurred'
