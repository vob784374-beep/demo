# Story 3.2: Course Publishing Workflow

## Story Metadata

| Field | Value |
|---|---|
| **Story ID** | 3.2 |
| **Story Key** | 3-2-course-publishing-workflow |
| **Epic** | Epic 3: Course Catalog & Enrollment |
| **Status** | review |
| **Date Created** | 2026-04-20 |

---

## User Story

**As a** teacher,
**I want** to publish and unpublish my courses,
**So that** I can control when students can discover and enroll in them.

---

## Acceptance Criteria

**AC1 — Publish with lesson returns 200**
Given a POST to `/api/v1/courses/<id>/publish` by the course owner
When the course has at least 1 lesson
Then HTTP 200 is returned and `is_published` is set to `true`

**AC2 — Publish without lesson returns 422**
Given a POST to `/api/v1/courses/<id>/publish` when the course has no lessons
When validation runs
Then HTTP 422 is returned with error detail "Course must have at least one lesson before publishing"

**AC3 — Unpublish returns 200**
Given a POST to `/api/v1/courses/<id>/unpublish` by the owner
When the request is processed
Then HTTP 200 is returned and `is_published` is set to `false`

---

## Implementation Tasks (Status)

- [x] Task 1: Add `publish_course` and `unpublish_course` to `course_service.py`
- [x] Task 2: Add `POST /<id>/publish` and `POST /<id>/unpublish` routes to `courses/routes.py`
- [x] Task 3: Unit tests for publish/unpublish service — 12 tests pass
- [x] Task 4: Integration tests for publishing workflow — 17 tests pass

## Status

- **Status:** review
- **Created:** 2026-04-20
- **Completed:** 2026-04-20

## Dev Agent Record

| Date | Agent | Action |
|---|---|---|
| 2026-04-20 | claude-sonnet-4-6 | Implemented all tasks; 29 tests pass (12 unit + 17 integration) |

### Completion Notes

- `publish_course` checks lesson count via `db.session.query(Lesson).filter_by(course_id=...)` — raises `ValueError` if 0
- Both publish and unpublish are idempotent (no error if already in desired state)
- Non-owner returns 403; missing/deleted course returns 404; no lessons returns 422
- `unpublish_course` does not require a lesson count check — always succeeds for the owner
- Routes follow same pattern as existing CRUD: LookupError→404, PermissionError→403, ValueError→422

### File List

- `backend/app/services/course_service.py` (MODIFIED — added publish_course, unpublish_course)
- `backend/app/api/v1/courses/routes.py` (MODIFIED — added /publish and /unpublish routes)
- `backend/tests/unit/services/test_course_publishing.py` (NEW)
- `backend/tests/integration/test_course_publishing.py` (NEW)
