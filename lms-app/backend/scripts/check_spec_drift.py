#!/usr/bin/env python
"""
CI enforcement: fail if the committed OpenAPI spec diverges from what the code generates.

Usage:
    python scripts/check_spec_drift.py
    python scripts/check_spec_drift.py --update   # regenerate and overwrite committed spec

Exit codes:
    0 — spec is in sync
    1 — drift detected (CI should fail)
"""
import sys
import json
import argparse
import os

# Ensure the backend package is importable from the script's location
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _load_committed(path: str) -> dict:
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def _generate_live() -> dict:
    from app import create_app
    app = create_app('development')
    with app.app_context():
        return app.extensions['smorest'].spec.to_dict()


def _normalise(spec: dict) -> str:
    return json.dumps(spec, sort_keys=True, indent=2, ensure_ascii=False)


def main() -> int:
    parser = argparse.ArgumentParser(description='Check OpenAPI spec drift')
    parser.add_argument('--spec', default='openapi/openapi.json',
                        help='Path to committed spec file (default: openapi/openapi.json)')
    parser.add_argument('--update', action='store_true',
                        help='Regenerate and overwrite the committed spec instead of comparing')
    args = parser.parse_args()

    spec_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), args.spec)

    live = _generate_live()

    if args.update:
        with open(spec_path, 'w', encoding='utf-8') as f:
            json.dump(live, f, indent=2, ensure_ascii=False)
        print(f'OK:Spec updated: {args.spec}')
        return 0

    if not os.path.exists(spec_path):
        print(f'FAIL:Committed spec not found at {args.spec}')
        print('    Run: python scripts/check_spec_drift.py --update')
        return 1

    committed = _load_committed(spec_path)

    if _normalise(live) == _normalise(committed):
        print('OK:OpenAPI spec is in sync with backend code.')
        return 0

    # Build a human-readable diff
    import difflib
    diff = list(difflib.unified_diff(
        _normalise(committed).splitlines(keepends=True),
        _normalise(live).splitlines(keepends=True),
        fromfile='committed openapi.json',
        tofile='generated from code',
        n=5,
    ))
    print('FAIL:OpenAPI spec DRIFT DETECTED — committed spec does not match the code.\n')
    print(''.join(diff[:120]))  # cap output
    if len(diff) > 120:
        print(f'    ... {len(diff) - 120} more lines truncated')
    print('\n    Fix: run  python scripts/check_spec_drift.py --update  then commit the result.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
