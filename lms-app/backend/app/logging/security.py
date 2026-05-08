"""
Security logger — authentication events, permission violations, anomalies.

Rules:
  - Never log a full email address (log domain only — GDPR/PII).
  - Never log tokens or passwords (mask_sensitive_fields handles it, but avoid
    passing them in the first place).
  - Log the client IP for every auth event (needed for abuse detection).
"""
import structlog

_logger = structlog.get_logger('lms.security')


def log_auth_success(*, user_id: int, email: str, ip: str) -> None:
    _logger.info(
        'auth_success',
        log_category='security',
        user_id=str(user_id),
        email_domain=_domain(email),
        ip=ip,
    )


def log_auth_failure(*, email: str, ip: str, reason: str) -> None:
    _logger.warning(
        'auth_failure',
        log_category='security',
        email_domain=_domain(email),
        ip=ip,
        reason=reason,
    )


def log_register_success(*, user_id: int, email: str, ip: str) -> None:
    _logger.info(
        'register_success',
        log_category='security',
        user_id=str(user_id),
        email_domain=_domain(email),
        ip=ip,
    )


def log_permission_denied(*, user_id: str, path: str, required_roles: list[str]) -> None:
    _logger.warning(
        'permission_denied',
        log_category='security',
        user_id=user_id,
        path=path,
        required_roles=required_roles,
    )


def log_token_revoked(*, user_id: str) -> None:
    _logger.info(
        'token_revoked',
        log_category='security',
        user_id=user_id,
    )


def _domain(email: str) -> str:
    return email.split('@')[-1] if '@' in email else 'unknown'
