# Story 3.1: Course Creation and Management API

## Story Metadata

| Field | Value |
|---|---|
| **Story ID** | 3.1 |
| **Story Key** | 3-1-course-creation-and-management-api |
| **Epic** | Epic 3: Course Catalog & Enrollment |
| **Status** | review |
| **Date Created** | 2026-04-20 |

---

## User Story

**As a** teacher,
**I want** to create and manage courses via the API,
**So that** I can build the course catalog for students.

---

## Acceptance Criteria

**AC1 — Course creation returns 201**
Given a POST to `/api/v1/courses` with `{"title": "...", "description": "...", "category": "..."}` and teacher JWT
When the course is created
Then HTTP 201 is returned with the new course object including `is_published: false`
And the course is owned by the authenticated teacher

**AC2 — Owner can update course**
Given a PATCH to `/api/v1/courses/<id>` by the course owner
When valid fields are provided
Then HTTP 200 is returned with updated course data

**AC3 — Non-owner update blocked**
Given a PATCH to `/api/v1/courses/<id>` by a different teacher
When ownership is checked
Then HTTP 403 is returned

**AC4 — Owner can soft-delete course without enrolled students**
Given a DELETE to `/api/v1/courses/<id>` by the owner
When the course has no enrolled students
Then HTTP 204 is returned and the course is soft-deleted (`deleted_at` set)

**AC5 — Owner can read their own unpublished course**
Given a GET to `/api/v1/courses/<id>` by the owner teacher
When the course is unpublished
Then HTTP 200 returns the full course including draft details

---

## Implementation Tasks (Status)

- [x] Task 1: Create `courses/schemas.py` — CreateCourseSchema, UpdateCourseSchema
- [x] Task 2: Implement `course_service.py` — create, get_for_teacher, update, delete (soft)
- [x] Task 3: Create `courses/routes.py` — POST, GET, PATCH, DELETE routes with RBAC
- [x] Task 4: Register courses blueprint in `api/v1/__init__.py`
- [x] Task 5: Unit tests for course_service — 14 tests pass
- [x] Task 6: Integration tests for course management API — 22 tests pass

## Status

- **Status:** review
- **Created:** 2026-04-20
- **Completed:** 2026-04-20

## Dev Agent Record

| Date | Agent | Action |
|---|---|---|
| 2026-04-20 | claude-sonnet-4-6 | Implemented all tasks; 36 tests pass (14 unit + 22 integration) |

### Completion Notes

- Courses blueprint registered at `/api/v1/courses`
- `teacher_id` from JWT identity is cast to `int` (JWT stores identity as string)
- Soft-delete: sets `deleted_at`, second delete raises LookupError (idempotent)
- Delete blocked when `CourseEnrollment` count > 0 → 422
- Non-owner GET returns 404 (not 403) to avoid information disclosure about course existence
- Test fixture (`_set_role`) must run within the `db_app.app_context()` scope to avoid SQLite session isolation issues on in-memory DBs

### File List

- `backend/app/api/v1/courses/schemas.py` (IMPLEMENTED)
- `backend/app/api/v1/courses/routes.py` (IMPLEMENTED)
- `backend/app/api/v1/courses/__init__.py` (IMPLEMENTED)
- `backend/app/services/course_service.py` (IMPLEMENTED)
- `backend/app/api/v1/__init__.py` (MODIFIED — added courses_bp)
- `backend/tests/unit/services/test_course_service.py` (NEW)
- `backend/tests/integration/test_course_management.py` (NEW)
