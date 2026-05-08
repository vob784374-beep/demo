#!/usr/bin/env python
"""
Launch the LMS API in development mode and open Swagger UI in the browser.

Usage:
    python scripts/preview_docs.py
    python scripts/preview_docs.py --port 8080
"""
import sys
import os
import argparse
import threading
import webbrowser
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    parser = argparse.ArgumentParser(description='Preview API docs locally')
    parser.add_argument('--port', type=int, default=5000, help='Port (default: 5000)')
    parser.add_argument('--no-browser', action='store_true', help='Do not open browser')
    args = parser.parse_args()

    os.environ.setdefault('APP_ENV', 'development')

    from app import create_app
    app = create_app('development')

    docs_url = f'http://localhost:{args.port}/api/docs'
    spec_url = f'http://localhost:{args.port}/api/openapi.json'

    print(f'\n🚀  LMS API starting on port {args.port}')
    print(f'    Swagger UI : {docs_url}')
    print(f'    OpenAPI JSON: {spec_url}')
    print('    Press Ctrl+C to stop\n')

    if not args.no_browser:
        def _open():
            time.sleep(1.5)
            webbrowser.open(docs_url)
        threading.Thread(target=_open, daemon=True).start()

    app.run(port=args.port, debug=True)


if __name__ == '__main__':
    main()
