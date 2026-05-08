"""
Custom structlog processors shared across all log categories.

Processor contract: (logger, method, event_dict) -> event_dict
Processors must not raise; they must return the (possibly mutated) event_dict.
"""
from __future__ import annotations

from typing import Any

# Keys whose values are always redacted, case-insensitive.
_SENSITIVE_KEYS: frozenset[str] = frozenset({
    'password', 'password_hash', 'new_password', 'confirm_password',
    'token', 'access_token', 'refresh_token', 'id_token',
    'authorization', 'secret', 'secret_key', 'api_key',
    'credit_card', 'card_number', 'cvv', 'ssn',
    'private_key', 'client_secret',
})

_REDACTED = '***REDACTED***'

# structlog internal keys that must not be touched by processors.
_RESERVED: frozenset[str] = frozenset({'_record', '_from_structlog'})


def mask_sensitive_fields(
    logger: Any, method: str, event_dict: dict
) -> dict:
    """Redact values at known-sensitive keys at the top level and recursively."""
    result: dict = {}
    for k, v in event_dict.items():
        if k in _RESERVED:
            result[k] = v
        elif k.lower() in _SENSITIVE_KEYS:
            result[k] = _REDACTED
        else:
            result[k] = _redact(v)
    return result


def _redact(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {
            k: _REDACTED if k.lower() in _SENSITIVE_KEYS else _redact(v)
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_redact(item) for item in obj]
    if isinstance(obj, tuple):
        return tuple(_redact(item) for item in obj)
    return obj


def add_service_context(service: str, environment: str):
    """
    Factory returning a processor that stamps every log entry with
    service and environment — the two fields required for multi-service
    log routing in ELK / Loki.
    """
    def processor(logger: Any, method: str, event_dict: dict) -> dict:
        event_dict.setdefault('service', service)
        event_dict.setdefault('environment', environment)
        return event_dict
    return processor
