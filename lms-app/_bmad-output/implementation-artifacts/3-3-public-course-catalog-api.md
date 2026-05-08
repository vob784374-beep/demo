# Story 3.3: Public Course Catalog API

## Story Metadata

| Field | Value |
|---|---|
| **Story ID** | 3.3 |
| **Story Key** | 3-3-public-course-catalog-api |
| **Epic** | Epic 3: Course Catalog & Enrollment |
| **Status** | review |
| **Date Created** | 2026-04-20 |

---

## User Story

**As a** student or anonymous visitor,
**I want** to browse published courses via the API,
**So that** I can discover available learning content.

---

## Acceptance Criteria

**AC1 — Public list returns paginated published courses**
Given a GET to `/api/v1/courses` (no auth required)
When courses exist with `is_published=true`
Then HTTP 200 returns `{"data": [...], "meta": {"page": 1, "per_page": 20, "total": N}, "error": null}`
And only published courses are included
And response is cached for 5 minutes (Redis in prod, SimpleCache in dev, NullCache in testing)

**AC2 — Pagination params work**
Given a GET to `/api/v1/courses?page=2&per_page=10`
When the request is processed
Then the correct page of results is returned

**AC3 — Public detail returns published course with enriched fields**
Given a GET to `/api/v1/courses/<id>` for a published course (no auth)
When the request is processed
Then HTTP 200 returns course details including `lesson_count` and `teacher_name`

**AC4 — Unpublished course returns 404 without auth**
Given a GET to `/api/v1/courses/<id>` for an unpublished course without auth
When the request is processed
Then HTTP 404 is returned

---

## Implementation Tasks (Status)

- [x] Task 1: Add `Flask-Caching==2.3.0` to requirements; wire `cache` extension
- [x] Task 2: Add cache config per environment (NullCache/SimpleCache/RedisCache)
- [x] Task 3: Add `list_published_courses` and `get_published_course` to `course_service.py`
- [x] Task 4: Add `paginated_response` to `responses.py`
- [x] Task 5: Add `GET /api/v1/courses` (public list, cached) to routes
- [x] Task 6: Change `GET /api/v1/courses/<id>` to `@jwt_required(optional=True)` for owner + public access
- [x] Task 7: Unit tests — 12 tests pass
- [x] Task 8: Integration tests — 17 tests pass

## Status

- **Status:** review
- **Created:** 2026-04-20
- **Completed:** 2026-04-20

## Dev Agent Record

| Date | Agent | Action |
|---|---|---|
| 2026-04-20 | claude-sonnet-4-6 | Implemented all tasks; 29 tests pass (12 unit + 17 integration); full suite 242/242 |

### Completion Notes

- `GET /api/v1/courses` uses `@cache.cached(timeout=300, query_string=True)` — cache key automatically includes `page` and `per_page` query params
- Cache backend: `NullCache` (testing), `SimpleCache` (development), `RedisCache` (staging/production via `REDIS_URL` env var)
- `GET /api/v1/courses/<id>` changed from `@require_role('teacher','admin')` to `@jwt_required(optional=True)`:
  - Authenticated owner → returns course regardless of published state (preserves 3.1 AC5)
  - All others → returns published course only, 404 for unpublished
- `get_published_course` returns `lesson_count` and `teacher_name` in addition to standard course fields
- `per_page` is capped at 100 to prevent large queries; invalid `page`/`per_page` returns 422
- 3.1 and 3.2 tests unaffected — existing owner-auth flows still work

### File List

- `backend/requirements/base.txt` (MODIFIED — Flask-Caching==2.3.0)
- `backend/app/extensions.py` (MODIFIED — added cache)
- `backend/app/config.py` (MODIFIED — added CACHE_TYPE per env)
- `backend/app/__init__.py` (MODIFIED — cache.init_app)
- `backend/app/utils/responses.py` (MODIFIED — added paginated_response)
- `backend/app/services/course_service.py` (MODIFIED — added list_published_courses, get_published_course)
- `backend/app/api/v1/courses/routes.py` (MODIFIED — public list route + optional JWT on detail)
- `backend/tests/unit/services/test_course_catalog.py` (NEW)
- `backend/tests/integration/test_course_catalog.py` (NEW)
