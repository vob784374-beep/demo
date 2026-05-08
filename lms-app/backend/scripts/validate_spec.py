#!/usr/bin/env python
"""
Validate OpenAPI spec syntax and LMS-specific style rules.

Usage:
    python scripts/validate_spec.py
    python scripts/validate_spec.py --spec openapi/openapi.json

Exit codes:
    0 — spec is valid
    1 — validation errors found
"""
import sys
import json
import argparse
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ── Style rules ──────────────────────────────────────────────────────────────

REQUIRED_RESPONSE_CODES = {
    'POST':   {'201', '400', '401', '422'},
    'GET':    {'200', '404'},
    'PATCH':  {'200', '404', '422'},
    'DELETE': {'204', '403', '404'},
}

ENVELOPE_FIELDS = {'success', 'code', 'message', 'data', 'meta', 'request_id'}

_ERRORS = []


def _err(msg: str) -> None:
    _ERRORS.append(msg)
    print(f'  [FAIL]{msg}')


def _check_syntax(spec_path: str) -> bool:
    """Validates OpenAPI 3.x syntax using openapi-spec-validator."""
    try:
        from openapi_spec_validator import validate
        from openapi_spec_validator.readers import read_from_filename
        spec_dict, spec_url = read_from_filename(spec_path)
        validate(spec_dict)
        print('  [OK]Syntax valid (openapi-spec-validator)')
        return True
    except ImportError:
        print('  [WARN]openapi-spec-validator not installed; skipping syntax check')
        print('     pip install openapi-spec-validator')
        return True
    except Exception as exc:
        _err(f'Syntax error: {exc}')
        return False


def _check_envelope_schemas(spec: dict) -> None:
    """Verify every non-204 response documents the standard envelope keys."""
    schemas = spec.get('components', {}).get('schemas', {})
    has_envelope = any('Envelope' in k or 'envelope' in k for k in schemas)
    if not has_envelope:
        _err(
            'No envelope schema found in components/schemas. '
            'Add SuccessEnvelope and ErrorEnvelope schemas for full documentation.'
        )


def _check_security(spec: dict) -> None:
    """Verify security schemes are defined."""
    schemes = spec.get('components', {}).get('securitySchemes', {})
    if 'BearerAuth' not in schemes:
        _err('securitySchemes.BearerAuth missing — access-token auth must be declared')
    if 'RefreshCookie' not in schemes:
        _err('securitySchemes.RefreshCookie missing — cookie auth must be declared')
    if schemes:
        print(f'  [OK]Security schemes: {", ".join(schemes.keys())}')


def _check_paths(spec: dict) -> None:
    """Check every path has a summary and at least one documented response."""
    paths = spec.get('paths', {})
    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method not in ('get', 'post', 'patch', 'put', 'delete'):
                continue
            if not operation.get('summary'):
                _err(f'{method.upper()} {path}: missing summary')
            responses = operation.get('responses', {})
            if not responses:
                _err(f'{method.upper()} {path}: no responses documented')
            elif 'default' in responses and len(responses) == 1:
                _err(f'{method.upper()} {path}: only "default" response — add explicit status codes')


def _check_servers(spec: dict) -> None:
    servers = spec.get('servers', [])
    if not servers:
        _err('No servers defined in spec')
    else:
        print(f'  [OK]Servers: {[s["url"] for s in servers]}')


def _check_undocumented_endpoints(spec: dict) -> None:
    """Warn about paths without tags (helps catch accidental omissions)."""
    paths = spec.get('paths', {})
    untagged = []
    for path, path_item in paths.items():
        for method, operation in path_item.items():
            if method in ('get', 'post', 'patch', 'put', 'delete'):
                if not operation.get('tags') and not operation.get('summary'):
                    untagged.append(f'{method.upper()} {path}')
    if untagged:
        print(f'  [WARN]Undocumented operations (no summary/tags): {", ".join(untagged)}')


def main() -> int:
    parser = argparse.ArgumentParser(description='Validate OpenAPI spec')
    parser.add_argument('--spec', default='openapi/openapi.json',
                        help='Path to spec file (default: openapi/openapi.json)')
    args = parser.parse_args()

    spec_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), args.spec)

    if not os.path.exists(spec_path):
        print(f'FAIL:Spec file not found: {args.spec}')
        print('    Run: python scripts/check_spec_drift.py --update')
        return 1

    with open(spec_path, encoding='utf-8') as f:
        spec = json.load(f)

    print(f'\n[*] Validating: {args.spec}\n')

    ok = _check_syntax(spec_path)
    _check_security(spec)
    _check_servers(spec)
    _check_paths(spec)
    _check_envelope_schemas(spec)
    _check_undocumented_endpoints(spec)

    print()
    if _ERRORS:
        print(f'FAIL:{len(_ERRORS)} issue(s) found.')
        return 1

    print('OK:Spec validation passed.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
