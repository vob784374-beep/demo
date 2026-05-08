"""
Development / testing middleware that validates every JSON response conforms
to the standard LMS envelope format.

Catches regressions before they reach CI — a route that forgets to call
success_response() or returns a raw dict will be flagged immediately.

Activated when VALIDATE_RESPONSE_ENVELOPE = True (set automatically in
development and testing unless explicitly disabled).

Violations raise AssertionError in testing (makes tests fail hard) and log
a WARNING in development (never crashes production).
"""
import json
import structlog
from flask import Flask, Request, Response

logger = structlog.get_logger('lms.spec')

# Fields required in every JSON response
_REQUIRED = frozenset({'success', 'code', 'message', 'data', 'meta', 'request_id'})


def _check_envelope(response: Response, request: Request) -> list[str]:
    """Return a list of violations; empty means the envelope is correct."""
    if response.status_code == 204:
        return []
    content_type = response.content_type or ''
    if 'application/json' not in content_type:
        return []

    try:
        body = json.loads(response.get_data(as_text=True))
    except (ValueError, UnicodeDecodeError):
        return ['Response body is not valid JSON']

    if not isinstance(body, dict):
        return ['Response body must be a JSON object (dict)']

    missing = _REQUIRED - body.keys()
    violations = [f'Missing envelope field: {f!r}' for f in sorted(missing)]

    success = body.get('success')
    code = body.get('code')
    status = response.status_code

    if success is not None:
        if not isinstance(success, bool):
            violations.append(f'"success" must be bool, got {type(success).__name__}')
        elif success and status >= 400:
            violations.append(f'"success": true but status={status}')
        elif not success and status < 400:
            violations.append(f'"success": false but status={status}')

    if code is not None and not isinstance(code, str):
        violations.append(f'"code" must be str, got {type(code).__name__}')

    return violations


def register_response_envelope_validator(app: Flask) -> None:
    if not app.config.get('VALIDATE_RESPONSE_ENVELOPE', False):
        return

    testing = app.config.get('TESTING', False)

    @app.after_request
    def validate_envelope(response: Response) -> Response:
        from flask import request as _req
        violations = _check_envelope(response, _req)
        if violations:
            msg = ' | '.join(violations)
            if testing:
                raise AssertionError(
                    f'Envelope violation on {_req.method} {_req.path}: {msg}'
                )
            logger.warning(
                'response_envelope_violation',
                method=_req.method,
                path=_req.path,
                status=response.status_code,
                violations=violations,
            )
        return response
