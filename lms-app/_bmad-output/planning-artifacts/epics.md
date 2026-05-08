---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-04-18'
inputDocuments: ['_bmad-output/planning-artifacts/architecture.md']
workflowType: 'epics-and-stories'
project_name: 'lms-app'
user_name: 'Bang'
date: '2026-04-18'
---

# lms-app - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for lms-app, decomposing the requirements from the Architecture document into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User registration with email and password
FR2: User login returning JWT access token and setting httpOnly refresh token cookie
FR3: JWT token refresh via refresh token cookie
FR4: User logout (invalidate refresh token)
FR5: Role-based access control with three roles: Student, Teacher, Admin
FR6: Role assignment and management by Admin
FR7: Course creation by Teachers (title, description, category, is_published)
FR8: Course editing and deletion by Teachers (own courses only)
FR9: Course publishing/unpublishing by Teachers
FR10: Public course catalog browsing (no auth required)
FR11: Course enrollment by Students
FR12: Lesson creation and management (CRUD) by Teachers within their courses
FR13: Lesson content viewing and playback by enrolled Students
FR14: Lesson completion marking by Students
FR15: Exercise creation and management (CRUD) by Teachers within lessons
FR16: Exercise submission by Students with answer input
FR17: Exercise auto-grading and immediate result feedback to Students
FR18: Assessment creation and management (CRUD) by Teachers within lessons
FR19: Assessment submission by Students
FR20: Assessment grading by Teachers (manual or auto)
FR21: Progress tracking per Student per lesson (started, in-progress, completed)
FR22: Student dashboard showing enrolled courses and overall progress
FR23: Teacher dashboard showing their courses and enrolled student stats
FR24: Admin dashboard showing system-level statistics
FR25: Admin user management (list, view, edit roles, activate/deactivate)
FR26: Media/audio file upload to S3 via presigned URLs (for Teachers)
FR27: Audio/video media playback for lesson content (especially Pronunciation course)
FR28: GET /api/v1/health endpoint (no auth, for ECS/ALB health checks)
FR29: Flask CLI seed-db command for populating dev/test data

### NonFunctional Requirements

NFR1: API performance — p95 response time under 200ms for read endpoints
NFR2: Frontend performance — SSG for course catalog; SSR for authenticated dashboards
NFR3: Scalability — ECS auto-scaling, Redis cache-aside, RDS read replicas (future)
NFR4: Security — JWT + RBAC, AWS Secrets Manager, HTTPS/TLS 1.2+, rate limiting (100 req/min IP; 20 req/min auth), httpOnly cookies for refresh tokens
NFR5: Maintainability — Flask Blueprint + Service layer separation, PEP 8, TypeScript strict mode, co-located frontend tests
NFR6: Availability — Production: Multi-AZ ECS + RDS; Dev/Staging: single-AZ cost-optimized
NFR7: Deployability — GitHub Actions CI/CD, ECS rolling deploys, zero-downtime, automated rollback via previous task definition revision
NFR8: Future-Readiness — CDN (CloudFront) from day 1, Redis in place for future async queues, service layer ready for microservice extraction

### Additional Requirements

- Monorepo structure: `lms-app/frontend/` (Next.js) and `lms-app/backend/` (Flask) in single git repo
- Frontend starter: `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
- Backend pattern: Flask Application Factory (`create_app()`) with Blueprints per domain
- Local dev orchestration: Docker Compose running MySQL 8.x (3306), Redis 7.x (6379), Flask (5000), Next.js (3000)
- Database ORM: SQLAlchemy 2.x with Flask-Migrate (Alembic) for version-controlled migrations
- Serialization: marshmallow 3.x for all request validation and response schemas
- API versioning: All endpoints under `/api/v1/` prefix
- Response envelope: All API responses use `{"data": ..., "meta": ..., "error": ...}` format
- Error standard: RFC 7807 Problem Details via centralized error handler in `app/middleware/error_handlers.py`
- Infrastructure: Terraform modules for VPC, ECS, RDS, ElastiCache, ALB, S3+CloudFront, Secrets
- Three environments: dev (t3.small, 1 AZ), staging (t3.small, 1 AZ), prod (t3.medium+, 2 AZ Multi-AZ)
- CI/CD: GitHub Actions — PR→develop deploys dev; merge→staging deploys staging; merge→main requires manual approval then deploys prod
- Secrets management: AWS Secrets Manager + SSM Parameter Store; never in code or committed files
- Logging: Structured JSON logs to AWS CloudWatch Logs from all containers
- Cache strategy: Cache-aside with Redis; invalidate on write; cache course/lesson reads

### UX Design Requirements

N/A — No UX Design document provided. UI implementation will follow the architectural patterns defined: shadcn/ui components, Tailwind CSS, role-based route groups `(auth)`, `(student)`, `(teacher)`, `(admin)` in Next.js App Router.

### FR Coverage Map

FR1:  Epic 2 — User registration
FR2:  Epic 2 — JWT login
FR3:  Epic 2 — Token refresh
FR4:  Epic 2 — Logout
FR5:  Epic 2 — RBAC (Student/Teacher/Admin)
FR6:  Epic 2 — Admin role assignment
FR7:  Epic 3 — Course creation by Teachers
FR8:  Epic 3 — Course edit/delete
FR9:  Epic 3 — Course publish/unpublish
FR10: Epic 3 — Public course catalog
FR11: Epic 3 — Student enrollment
FR12: Epic 4 — Lesson CRUD by Teachers
FR13: Epic 4 — Lesson viewing by Students
FR14: Epic 4 — Lesson completion marking
FR15: Epic 4 — Exercise CRUD by Teachers
FR16: Epic 4 — Exercise submission by Students
FR17: Epic 4 — Exercise auto-grading
FR18: Epic 4 — Assessment CRUD by Teachers
FR19: Epic 4 — Assessment submission
FR20: Epic 4 — Assessment grading by Teachers
FR21: Epic 5 — Progress tracking per student/lesson
FR22: Epic 5 — Student dashboard
FR23: Epic 5 — Teacher dashboard
FR24: Epic 5 — Admin dashboard
FR25: Epic 5 — Admin user management
FR26: Epic 4 — Media upload via S3 presigned URLs
FR27: Epic 4 — Audio/video playback (Pronunciation course)
FR28: Epic 1 — Health check endpoint
FR29: Epic 1 — Dev seeding command

## Epic List

### Epic 1: Project Foundation & Development Environment
Developers can run the full LMS stack locally with one command, the database schema is initialized, and core middleware (auth, errors, logging) is in place — enabling all subsequent epics to be built on a solid foundation.
**FRs covered:** FR28, FR29
**Additional Reqs:** Monorepo setup, Docker Compose, Flask App Factory, Next.js init, SQLAlchemy schema, Flask-Migrate, shadcn/ui baseline, Redis

### Epic 2: User Authentication & Authorization
Students, teachers, and admins can register, log in, and access role-appropriate areas of the platform. Unauthorized access is blocked.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6

### Epic 3: Course Catalog & Enrollment
Teachers can create, edit, and publish courses. Students can browse the public catalog and enroll. The content hierarchy (Course) is established.
**FRs covered:** FR7, FR8, FR9, FR10, FR11

### Epic 4: Learning Content, Exercises & Assessments
Students can study lessons, submit exercises, and complete assessments. Teachers can create and manage all lesson content including audio/media. The full Course → Lesson → Exercise → Assessment hierarchy is live.
**FRs covered:** FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR26, FR27

### Epic 5: Progress Tracking & Dashboards
Students see their learning progress and enrolled courses. Teachers see student performance across their courses. Admins manage users and view system stats. All three role dashboards are operational.
**FRs covered:** FR21, FR22, FR23, FR24, FR25

### Epic 6: Production Infrastructure & CI/CD
The system is deployed to AWS with three isolated environments (dev/staging/prod), automated CI/CD pipelines, Terraform infrastructure as code, and production monitoring — enabling safe, repeatable deployments with rollback capability.
**FRs covered:** All infrastructure Additional Requirements
**NFRs addressed:** NFR3, NFR6, NFR7, NFR8

---

## Epic 1: Project Foundation & Development Environment

Developers can run the full LMS stack locally with one command, the database schema is initialized, and core middleware (auth, errors, logging) is in place — enabling all subsequent epics to be built on a solid foundation.

### Story 1.1: Initialize Monorepo and Project Structure

As a developer,
I want a properly structured monorepo with frontend and backend directories initialized,
So that the team has a consistent starting point and can begin feature development immediately.

**Acceptance Criteria:**

**Given** the repository is cloned
**When** the developer examines the project root
**Then** the following structure exists: `frontend/`, `backend/`, `infrastructure/terraform/`, `.github/workflows/`, `docker-compose.yml`, `README.md`
**And** `frontend/` is initialized with `create-next-app` (TypeScript, Tailwind, ESLint, App Router, `src/` dir, `@/*` alias)
**And** `backend/` contains `app/`, `migrations/`, `tests/`, `requirements/` directories
**And** `infrastructure/terraform/` contains `modules/` and `environments/dev,staging,prod/` directories

**Given** the developer opens the frontend
**When** they run `npm run dev`
**Then** Next.js starts on port 3000 with no errors

**Given** the developer opens the backend
**When** they run `flask run`
**Then** Flask starts on port 5000 with no errors

---

### Story 1.2: Configure Local Development Environment

As a developer,
I want Docker Compose to orchestrate all local services (MySQL, Redis, Flask, Next.js),
So that the full stack runs with a single command and matches the production service topology.

**Acceptance Criteria:**

**Given** Docker Desktop is running
**When** the developer runs `docker-compose up`
**Then** MySQL 8.x starts on port 3306
**And** Redis 7.x starts on port 6379
**And** Flask API starts on port 5000 with hot-reload enabled
**And** Next.js starts on port 3000 with HMR enabled

**Given** all services are running
**When** the developer sends `GET http://localhost:5000/api/v1/health`
**Then** the response is `{"data": {"status": "ok"}, "meta": null, "error": null}` with HTTP 200

**Given** a code change is made in `backend/app/`
**When** the file is saved
**Then** Flask reloads automatically without restarting the container

---

### Story 1.3: Flask Application Factory and Core Middleware

As a developer,
I want the Flask app to use the Application Factory pattern with all core middleware registered,
So that the API has consistent error handling, logging, CORS, rate limiting, and JWT support from day one.

**Acceptance Criteria:**

**Given** the Flask app is started
**When** any request is received
**Then** structured JSON logs are emitted to stdout in the format: `{"timestamp": "...", "method": "...", "path": "...", "status": ..., "duration_ms": ...}`

**Given** an unhandled exception occurs in any route
**When** the error propagates to the handler
**Then** the response follows RFC 7807 format: `{"data": null, "meta": null, "error": {"type": "INTERNAL_ERROR", "title": "...", "detail": "...", "status": 500}}`

**Given** a request comes from an unapproved origin in staging/prod
**When** CORS headers are checked
**Then** the request is rejected with HTTP 403

**Given** `app/config.py` exists
**When** `APP_ENV=development|staging|production` environment variable is set
**Then** the correct config class (`DevelopmentConfig`, `StagingConfig`, `ProductionConfig`) is loaded with appropriate settings

**Given** `app/extensions.py` exists
**When** `create_app()` is called
**Then** SQLAlchemy, Flask-Migrate, Flask-JWT-Extended, Flask-CORS, and Flask-Limiter are all initialized on the app instance

---

### Story 1.4: Database Schema and Initial Migration

As a developer,
I want all database tables created via Flask-Migrate with proper indexes and relationships,
So that the schema is version-controlled and reproducible across all environments.

**Acceptance Criteria:**

**Given** the MySQL container is running
**When** the developer runs `flask db upgrade`
**Then** the following tables are created: `users`, `roles`, `user_roles`, `courses`, `course_enrollments`, `lessons`, `lesson_progress`, `exercises`, `exercise_submissions`, `assessments`, `assessment_submissions`, `course_media`

**Given** the schema is created
**When** the developer inspects the `users` table
**Then** columns follow snake_case convention: `id`, `email`, `password_hash`, `first_name`, `last_name`, `is_active`, `created_at`, `updated_at`
**And** `idx_users_email` unique index exists on `email`

**Given** the migrations folder
**When** `flask db migrate` is run after a model change
**Then** a new versioned migration file is created in `migrations/versions/`

**Given** the developer runs `flask seed-db`
**When** seeding completes
**Then** 3 test users exist (one per role: student@test.com, teacher@test.com, admin@test.com) with password `Test1234!`
**And** 2 sample courses with at least 1 lesson each are created

---

### Story 1.5: Next.js Frontend Base Configuration

As a developer,
I want the Next.js frontend configured with shadcn/ui, Axios API client, Zustand stores, and TanStack Query,
So that all frontend features can be built on a consistent, production-ready base.

**Acceptance Criteria:**

**Given** the frontend is initialized
**When** shadcn/ui is configured
**Then** base components (Button, Input, Card, Badge, Skeleton, Toast) are available in `src/components/ui/`

**Given** `src/lib/api/client.ts` exists
**When** a request returns HTTP 401
**Then** the Axios interceptor automatically calls `POST /api/v1/auth/refresh` and retries the original request
**And** if refresh fails, the user is redirected to `/login`

**Given** `src/lib/stores/authStore.ts` exists (Zustand)
**When** a user logs in
**Then** `user`, `role`, and `accessToken` are stored in memory (not localStorage)

**Given** `src/app/layout.tsx` exists
**When** any page loads
**Then** `TanStack QueryClientProvider` and `ToastProvider` wrap all page content

---

## Epic 2: User Authentication & Authorization

Students, teachers, and admins can register, log in, and access role-appropriate areas of the platform. Unauthorized access is blocked.

### Story 2.1: User Registration API

As a new user,
I want to register with my email and password,
So that I can create an account and access the platform.

**Acceptance Criteria:**

**Given** a POST request to `/api/v1/auth/register` with valid `{"email": "...", "password": "...", "first_name": "...", "last_name": "..."}`
**When** the email is not already registered
**Then** the user is created with `role=student` (default), password bcrypt-hashed, and response is HTTP 201 with `{"data": {"id": ..., "email": "...", "role": "student"}, "meta": null, "error": null}`

**Given** a POST to `/api/v1/auth/register` with an existing email
**When** the request is processed
**Then** HTTP 422 is returned with `{"error": {"type": "VALIDATION_ERROR", "detail": "Email already registered", "status": 422}}`

**Given** a POST with missing required fields
**When** marshmallow schema validation runs
**Then** HTTP 422 is returned listing all missing fields

**Given** a password shorter than 8 characters
**When** registration is attempted
**Then** HTTP 422 is returned with `{"error": {"detail": "Password must be at least 8 characters"}}`

---

### Story 2.2: User Login and JWT Token Issuance

As a registered user,
I want to log in with my email and password,
So that I receive a JWT access token and can access protected endpoints.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/auth/login` with valid credentials
**When** credentials match a user record
**Then** HTTP 200 is returned with `{"data": {"access_token": "...", "user": {"id": ..., "email": "...", "role": "..."}}, "meta": null, "error": null}`
**And** a `httpOnly` cookie named `refresh_token` is set with 7-day expiry
**And** the access token expires in 15 minutes

**Given** a POST to `/api/v1/auth/login` with wrong password
**When** bcrypt comparison fails
**Then** HTTP 401 is returned with `{"error": {"type": "UNAUTHORIZED", "detail": "Invalid credentials", "status": 401}}`

**Given** the auth endpoint
**When** more than 20 login requests come from the same IP within 1 minute
**Then** HTTP 429 is returned with retry-after header

---

### Story 2.3: Token Refresh and Logout

As a logged-in user,
I want my session to refresh automatically and be able to log out cleanly,
So that I stay logged in during active use without security risk.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/auth/refresh` with a valid `refresh_token` cookie
**When** the refresh token is not expired
**Then** HTTP 200 is returned with a new `access_token` in the response body

**Given** a POST to `/api/v1/auth/refresh` with an expired or missing cookie
**When** the token is validated
**Then** HTTP 401 is returned

**Given** a POST to `/api/v1/auth/logout` with valid JWT
**When** the request is processed
**Then** HTTP 200 is returned and the `refresh_token` cookie is cleared (max-age=0)

---

### Story 2.4: Role-Based Access Control Middleware

As a system,
I want all API routes protected by JWT verification and role-based authorization,
So that users can only access resources appropriate to their role.

**Acceptance Criteria:**

**Given** a request to any protected endpoint without an Authorization header
**When** `auth_middleware` runs
**Then** HTTP 401 is returned

**Given** a request to `POST /api/v1/courses` (teacher-only) with a valid student JWT
**When** `@require_role('teacher')` decorator runs
**Then** HTTP 403 is returned with `{"error": {"type": "FORBIDDEN", "detail": "Insufficient role", "status": 403}}`

**Given** a request to `GET /api/v1/users` (admin-only) with a valid teacher JWT
**When** the decorator runs
**Then** HTTP 403 is returned

**Given** a request with a valid teacher JWT to a teacher-only endpoint
**When** authorization passes
**Then** the route handler executes normally

**Given** `GET /api/v1/courses` (public catalog endpoint)
**When** called without any JWT
**Then** HTTP 200 is returned with course data

---

### Story 2.5: Frontend Login and Registration Pages

As a new or returning user,
I want login and registration pages with form validation,
So that I can authenticate and be redirected to my role-appropriate dashboard.

**Acceptance Criteria:**

**Given** the user visits `/login`
**When** the page loads
**Then** a form with email and password fields is displayed

**Given** the user submits valid credentials
**When** the API returns a successful login response
**Then** the access token is stored in Zustand `authStore`
**And** the user is redirected to `/student/dashboard`, `/teacher/dashboard`, or `/admin/dashboard` based on their role

**Given** the user submits invalid credentials
**When** the API returns HTTP 401
**Then** a toast error notification "Invalid email or password" is displayed
**And** the user remains on the login page

**Given** the user visits `/register`
**When** they complete the form and submit
**Then** the account is created and they are automatically logged in and redirected to `/student/dashboard`

**Given** Zod schema validation on the form
**When** the user submits with an invalid email format
**Then** inline error "Please enter a valid email address" appears before the API call is made

---

### Story 2.6: Protected Route Guards and Role Navigation

As an authenticated user,
I want the application to enforce role-based routing,
So that students cannot access teacher routes and vice versa.

**Acceptance Criteria:**

**Given** an unauthenticated user visits `/student/dashboard`
**When** Next.js middleware runs
**Then** the user is redirected to `/login`

**Given** a logged-in student visits `/teacher/dashboard`
**When** the role guard checks the user's role
**Then** the user is redirected to `/student/dashboard`

**Given** a logged-in teacher visits `/admin/dashboard`
**When** the role guard runs
**Then** the user is redirected to `/teacher/dashboard`

**Given** a logged-in admin visits any route
**When** the role guard runs
**Then** access is granted to all areas

**Given** `src/middleware.ts` is configured
**When** any request hits a protected route
**Then** the JWT is verified from the `authStore` and role is checked before rendering

---

## Epic 3: Course Catalog & Enrollment

Teachers can create, edit, and publish courses. Students can browse the public catalog and enroll. The content hierarchy (Course) is established.

### Story 3.1: Course Creation and Management API

As a teacher,
I want to create and manage courses via the API,
So that I can build the course catalog for students.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/courses` with `{"title": "...", "description": "...", "category": "..."}` and teacher JWT
**When** the course is created
**Then** HTTP 201 is returned with the new course object including `is_published: false`
**And** the course is owned by the authenticated teacher

**Given** a PATCH to `/api/v1/courses/<id>` by the course owner
**When** valid fields are provided
**Then** HTTP 200 is returned with updated course data

**Given** a PATCH to `/api/v1/courses/<id>` by a different teacher
**When** ownership is checked
**Then** HTTP 403 is returned

**Given** a DELETE to `/api/v1/courses/<id>` by the owner
**When** the course has no enrolled students
**Then** HTTP 204 is returned and the course is soft-deleted (`deleted_at` set)

**Given** a GET to `/api/v1/courses/<id>` by the owner teacher
**When** the course is unpublished
**Then** HTTP 200 returns the full course including draft details

---

### Story 3.2: Course Publishing Workflow

As a teacher,
I want to publish and unpublish my courses,
So that I control when students can discover and enroll in them.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/courses/<id>/publish` by the course owner
**When** the course has at least 1 lesson
**Then** HTTP 200 is returned and `is_published` is set to `true`

**Given** a POST to `/api/v1/courses/<id>/publish` when course has no lessons
**When** validation runs
**Then** HTTP 422 is returned with `{"error": {"detail": "Course must have at least one lesson before publishing"}}`

**Given** a POST to `/api/v1/courses/<id>/unpublish` by the owner
**When** the request is processed
**Then** HTTP 200 is returned and `is_published` is set to `false`
**And** the course disappears from the public catalog immediately

---

### Story 3.3: Public Course Catalog API

As a student or anonymous visitor,
I want to browse published courses via the API,
So that I can discover available learning content.

**Acceptance Criteria:**

**Given** a GET to `/api/v1/courses` (no auth required)
**When** courses exist with `is_published=true`
**Then** HTTP 200 returns paginated list: `{"data": [...], "meta": {"page": 1, "per_page": 20, "total": ...}, "error": null}`
**And** only published courses are included
**And** response is cached in Redis for 5 minutes

**Given** a GET to `/api/v1/courses?page=2&per_page=10`
**When** the request is processed
**Then** the correct page of results is returned

**Given** a GET to `/api/v1/courses/<id>` for a published course (no auth)
**When** the request is processed
**Then** HTTP 200 returns course details including title, description, category, lesson count, teacher name

**Given** a GET to `/api/v1/courses/<id>` for an unpublished course without auth
**When** the request is processed
**Then** HTTP 404 is returned

---

### Story 3.4: Course Catalog Frontend

As a student or visitor,
I want to see a visually appealing course catalog page,
So that I can discover and choose courses to study.

**Acceptance Criteria:**

**Given** the user visits `/courses`
**When** the page loads
**Then** published courses are displayed as cards with title, description, and category badge
**And** the page is statically generated (SSG/ISR) for fast load times

**Given** the user is on the course catalog
**When** more than 20 courses exist
**Then** pagination controls are shown and function correctly

**Given** the course catalog page
**When** the user is not logged in
**Then** the page loads successfully without an auth error
**And** a "Log in to enroll" CTA is displayed on each course card

**Given** skeleton loading components
**When** the course data is still fetching on client-side updates
**Then** `CourseCard` skeleton placeholders are shown instead of blank space

---

### Story 3.5: Course Detail and Student Enrollment

As a student,
I want to view a course detail page and enroll in a course,
So that I can begin learning.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/courses/<id>/enroll` with student JWT
**When** the student is not already enrolled
**Then** HTTP 201 is returned and an `course_enrollments` record is created

**Given** a POST to `/api/v1/courses/<id>/enroll` when already enrolled
**When** the duplicate check runs
**Then** HTTP 422 is returned with `{"error": {"detail": "Already enrolled in this course"}}`

**Given** the student visits `/courses/<id>`
**When** they are not enrolled
**Then** an "Enroll Now" button is displayed
**And** clicking it calls the enroll API and shows a success toast

**Given** the student visits `/courses/<id>` after enrolling
**When** the page loads
**Then** a "Continue Learning" button appears linking to the first incomplete lesson

---

## Epic 4: Learning Content, Exercises & Assessments

Students can study lessons, submit exercises, and complete assessments. Teachers can create and manage all lesson content including audio/media. The full Course → Lesson → Exercise → Assessment hierarchy is live.

### Story 4.1: Lesson CRUD API

As a teacher,
I want to create and manage lessons within my courses,
So that I can organize learning content for students.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/courses/<id>/lessons` with `{"title": "...", "content": "...", "order": 1}` and teacher JWT
**When** the teacher owns the course
**Then** HTTP 201 is returned with the new lesson object

**Given** a PATCH to `/api/v1/lessons/<id>` by the course owner
**When** valid fields are provided
**Then** HTTP 200 returns the updated lesson

**Given** a DELETE to `/api/v1/lessons/<id>` by the owner
**When** no student submissions exist for exercises in this lesson
**Then** HTTP 204 is returned

**Given** a GET to `/api/v1/courses/<id>/lessons` with student JWT
**When** the student is enrolled in the course
**Then** HTTP 200 returns the ordered list of lessons
**And** each lesson includes the student's `progress_status` (not_started, in_progress, completed)

---

### Story 4.2: Lesson Viewing and Completion

As a student,
I want to view lesson content and mark lessons as complete,
So that I can track my learning progress through a course.

**Acceptance Criteria:**

**Given** the student visits `/courses/<id>/lessons/<lessonId>`
**When** they are enrolled in the course
**Then** the lesson content is displayed
**And** a `lesson_progress` record with `status=in_progress` is created if none exists

**Given** a POST to `/api/v1/lessons/<id>/complete` with student JWT
**When** the student is enrolled
**Then** HTTP 200 is returned and `lesson_progress.status` is set to `completed`
**And** `completed_at` timestamp is set

**Given** a GET to `/api/v1/lessons/<id>` without enrollment
**When** authorization runs
**Then** HTTP 403 is returned

**Given** the lesson page
**When** the student has completed the lesson
**Then** a visual "Completed" indicator is shown
**And** a "Next Lesson" button navigates to the following lesson

---

### Story 4.3: Media Upload and Audio Playback

As a teacher,
I want to upload audio and video files to lesson content via S3,
So that students can access rich media (especially for the Pronunciation course).

**Acceptance Criteria:**

**Given** a POST to `/api/v1/media/presigned-url` with `{"file_name": "audio.mp3", "content_type": "audio/mpeg", "lesson_id": ...}` and teacher JWT
**When** the request is valid
**Then** HTTP 200 returns `{"data": {"upload_url": "https://s3.../...", "s3_key": "media/...mp3"}, ...}`
**And** the presigned URL expires in 5 minutes

**Given** the teacher receives the presigned URL
**When** they PUT the file directly to S3 using the URL
**Then** the upload succeeds with HTTP 200 from S3

**Given** a PATCH to `/api/v1/lessons/<id>` with `{"media_s3_key": "media/...mp3"}` after upload
**When** the lesson is updated
**Then** the S3 key is stored in `course_media` table

**Given** a student visits a lesson with media
**When** the `LessonPlayer` component renders
**Then** the audio/video player is displayed using a CloudFront URL derived from the S3 key
**And** playback controls (play, pause, seek, volume) are functional

---

### Story 4.4: Exercise Creation and Management API

As a teacher,
I want to create exercises within lessons,
So that students can practice what they've learned.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/lessons/<id>/exercises` with `{"title": "...", "question": "...", "exercise_type": "multiple_choice", "options": [...], "correct_answer": "..."}` and teacher JWT
**When** the teacher owns the lesson's course
**Then** HTTP 201 returns the new exercise

**Given** a GET to `/api/v1/exercises/<id>` by a student
**When** the student is enrolled in the parent course
**Then** HTTP 200 returns the exercise without `correct_answer` field exposed

**Given** a DELETE to `/api/v1/exercises/<id>` by the teacher
**When** no submissions exist
**Then** HTTP 204 is returned

---

### Story 4.5: Exercise Submission and Auto-Grading

As a student,
I want to submit answers to exercises and receive immediate feedback,
So that I can learn from my mistakes in real time.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/exercises/<id>/submit` with `{"answer": "..."}` and student JWT
**When** the submission is processed
**Then** HTTP 200 returns `{"data": {"is_correct": true/false, "correct_answer": "...", "score": 100/0}, ...}`
**And** an `exercise_submissions` record is created with `answer`, `is_correct`, `score`, `submitted_at`

**Given** a student submits an exercise they already answered
**When** the duplicate check runs
**Then** the new submission is saved and the previous one is retained (history preserved)

**Given** `exercise_type=multiple_choice`
**When** the submitted answer exactly matches `correct_answer`
**Then** `is_correct=true` and `score=100`

**Given** the exercise submission frontend
**When** the student clicks "Submit"
**Then** a loading spinner is shown during the request
**And** on success, the result (correct/incorrect + correct answer) is displayed inline

---

### Story 4.6: Assessment Creation and Management API

As a teacher,
I want to create assessments at the end of lessons,
So that I can formally evaluate student understanding.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/lessons/<id>/assessments` with `{"title": "...", "description": "...", "passing_score": 70}` and teacher JWT
**When** the teacher owns the lesson's course
**Then** HTTP 201 returns the new assessment

**Given** a GET to `/api/v1/assessments/<id>` by an enrolled student
**When** the request is made
**Then** HTTP 200 returns assessment details without grading keys

**Given** a PATCH to `/api/v1/assessments/<id>` by the teacher
**When** `passing_score` is updated
**Then** HTTP 200 returns the updated assessment

---

### Story 4.7: Assessment Submission and Grading

As a student,
I want to submit assessments and receive a grade,
So that I can verify I've mastered the lesson material.

**Acceptance Criteria:**

**Given** a POST to `/api/v1/assessments/<id>/submit` with `{"answers": [...]}` and student JWT
**When** the submission is saved
**Then** HTTP 201 returns `{"data": {"submission_id": ..., "status": "submitted"}, ...}`
**And** an `assessment_submissions` record is created with `status=submitted`

**Given** a POST to `/api/v1/assessments/<id>/grade` with `{"submission_id": ..., "score": 85, "feedback": "..."}` and teacher JWT
**When** the teacher owns the assessment's course
**Then** HTTP 200 returns the updated submission with `score=85`, `status=graded`, `has_passed=true` (score >= passing_score)

**Given** the student's assessment submission page
**When** their assessment has been graded
**Then** their score, pass/fail status, and teacher feedback are displayed
**And** if `has_passed=true`, a "Lesson Complete" badge is shown

---

## Epic 5: Progress Tracking & Dashboards

Students see their learning progress and enrolled courses. Teachers see student performance across their courses. Admins manage users and view system stats. All three role dashboards are operational.

### Story 5.1: Progress Tracking API

As a student,
I want the system to track my learning progress across all enrolled courses,
So that I can see how far I've come and what remains.

**Acceptance Criteria:**

**Given** a GET to `/api/v1/progress/me` with student JWT
**When** the request is processed
**Then** HTTP 200 returns `{"data": [{"course_id": ..., "title": "...", "completed_lessons": 3, "total_lessons": 8, "percent_complete": 37}], ...}`
**And** response is cached in Redis for 60 seconds per user

**Given** a student completes a lesson
**When** `POST /api/v1/lessons/<id>/complete` succeeds
**Then** the Redis progress cache for that student is invalidated

**Given** a GET to `/api/v1/progress/<user_id>` with teacher JWT
**When** the user is enrolled in one of the teacher's courses
**Then** HTTP 200 returns that student's progress for the teacher's courses only

**Given** a GET to `/api/v1/progress/<user_id>` with teacher JWT for a student not in their courses
**When** the authorization check runs
**Then** HTTP 403 is returned

---

### Story 5.2: Student Dashboard

As a student,
I want a personalized dashboard showing my enrolled courses and progress,
So that I can quickly resume learning where I left off.

**Acceptance Criteria:**

**Given** a logged-in student visits `/student/dashboard`
**When** the page loads
**Then** all enrolled courses are listed with progress bars showing completion percentage
**And** each course card has a "Continue" button linking to the last incomplete lesson

**Given** a student with no enrollments visits the dashboard
**When** the page renders
**Then** an empty state with a "Browse Courses" CTA is displayed

**Given** TanStack Query fetches progress data
**When** the data is loading
**Then** `StudentProgressCard` skeleton components are shown

**Given** a student has completed a course (all lessons complete)
**When** the dashboard renders
**Then** a "Completed" badge is shown on that course card

---

### Story 5.3: Teacher Dashboard

As a teacher,
I want a dashboard showing my courses and student performance metrics,
So that I can monitor how well students are progressing.

**Acceptance Criteria:**

**Given** a logged-in teacher visits `/teacher/dashboard`
**When** the page loads
**Then** all their courses are listed with enrolled student count and average completion rate

**Given** the teacher clicks on a course
**When** they navigate to `/teacher/courses/<id>/students`
**Then** a table of enrolled students with their completion percentage and last activity date is shown

**Given** a teacher with no courses visits the dashboard
**When** the page renders
**Then** an empty state with a "Create Your First Course" CTA is shown

**Given** the teacher dashboard stats
**When** 0 students have enrolled in any course
**Then** stats show "0 enrolled students" rather than an error

---

### Story 5.4: Admin Dashboard and User Management

As an admin,
I want a dashboard with system stats and the ability to manage all users,
So that I can monitor platform health and control user access.

**Acceptance Criteria:**

**Given** a logged-in admin visits `/admin/dashboard`
**When** the page loads
**Then** system stats are displayed: total users, total courses, total enrollments, active users (last 30 days)

**Given** a GET to `/api/v1/users` with admin JWT
**When** the request is processed
**Then** HTTP 200 returns paginated list of all users with `id`, `email`, `role`, `is_active`, `created_at`

**Given** a PATCH to `/api/v1/users/<id>` with `{"role": "teacher"}` by admin
**When** the role update is valid
**Then** HTTP 200 returns the updated user and their role is changed in `user_roles`

**Given** a PATCH to `/api/v1/users/<id>` with `{"is_active": false}` by admin
**When** processed
**Then** the user account is deactivated and they cannot log in until reactivated

**Given** the admin visits `/admin/users`
**When** the page loads
**Then** a searchable, paginated table of all users is displayed with role and status columns
**And** inline role edit and activate/deactivate actions are available per row

---

## Epic 6: Production Infrastructure & CI/CD

The system is deployed to AWS with three isolated environments (dev/staging/prod), automated CI/CD pipelines, Terraform infrastructure as code, and production monitoring — enabling safe, repeatable deployments with rollback capability.

### Story 6.1: Terraform VPC and Networking

As a DevOps engineer,
I want Terraform modules for VPC, subnets, and security groups,
So that each environment has isolated, properly secured networking.

**Acceptance Criteria:**

**Given** `terraform apply` is run in `infrastructure/terraform/environments/dev/`
**When** the VPC module executes
**Then** a VPC is created with public and private subnets across the configured AZ(s)
**And** an Internet Gateway and NAT Gateway are provisioned
**And** security groups allow: ALB (80/443 inbound), ECS tasks (from ALB), RDS (from ECS), Redis (from ECS)

**Given** `terraform apply` for staging or prod
**When** executed
**Then** separate VPCs are created with no cross-environment network access

**Given** `terraform destroy` in dev
**When** executed
**Then** only dev resources are destroyed; staging and prod are unaffected

---

### Story 6.2: RDS, ElastiCache, and Secrets Infrastructure

As a DevOps engineer,
I want Terraform modules for RDS MySQL, ElastiCache Redis, and AWS Secrets Manager,
So that data persistence and secrets are managed securely per environment.

**Acceptance Criteria:**

**Given** Terraform applies the `rds` module in prod
**When** the database is created
**Then** an RDS MySQL 8.x Multi-AZ instance is provisioned in the private subnet
**And** automated daily backups with 7-day retention are enabled

**Given** Terraform applies the `rds` module in dev/staging
**When** the database is created
**Then** a single-AZ `db.t3.small` instance is provisioned

**Given** Terraform applies the `elasticache` module
**When** the cluster is created
**Then** a Redis 7.x cluster is provisioned in the private subnet accessible only from ECS tasks

**Given** Terraform applies the `secrets` module
**When** the secrets are created
**Then** `JWT_SECRET`, `DB_PASSWORD`, `REDIS_URL` are stored in AWS Secrets Manager per environment
**And** IAM roles for ECS task execution allow read access to these secrets

---

### Story 6.3: ECS Fargate Services and ALB

As a DevOps engineer,
I want Terraform modules for ECS Fargate (backend and frontend) and ALB,
So that containers run without server management with path-based routing.

**Acceptance Criteria:**

**Given** Terraform applies the `ecs` and `alb` modules
**When** the services are created
**Then** an ECS cluster with two Fargate services (backend, frontend) is provisioned
**And** the ALB routes `/api/*` to the backend target group and `/*` to the frontend target group

**Given** the backend ECS service is running
**When** `GET /api/v1/health` is called
**Then** the ALB returns HTTP 200 (health check passes, task registers as healthy)

**Given** a new ECS task definition is deployed
**When** the rolling update runs
**Then** new tasks are started before old tasks are stopped (zero-downtime)

**Given** prod environment
**When** the ECS service is configured
**Then** minimum 2 tasks run across 2 AZs for the backend service

---

### Story 6.4: S3 and CloudFront Media Distribution

As a DevOps engineer,
I want Terraform modules for S3 and CloudFront,
So that media assets are served globally with low latency.

**Acceptance Criteria:**

**Given** Terraform applies the `s3_cloudfront` module
**When** the resources are created
**Then** an S3 bucket is provisioned with public access blocked
**And** a CloudFront distribution is created pointing to the S3 bucket with HTTPS enforced

**Given** a media file is uploaded to S3 via presigned URL
**When** a student accesses the CloudFront URL for that file
**Then** the file is served within 200ms (cached at edge)

**Given** the S3 bucket policy
**When** direct S3 URL access is attempted
**Then** access is denied (objects only accessible via CloudFront)

---

### Story 6.5: GitHub Actions CI/CD Pipelines

As a developer,
I want automated CI/CD pipelines for all three environments,
So that code changes are tested, built, and deployed automatically with manual approval for production.

**Acceptance Criteria:**

**Given** a PR is opened targeting the `develop` branch
**When** the `ci-dev.yml` workflow runs
**Then** backend linting (flake8), tests (pytest), and Docker build succeed
**And** frontend type-check (tsc), linting (eslint), and Docker build succeed
**And** if all pass, new ECS task definitions are deployed to the dev environment

**Given** a PR is merged to `staging`
**When** `ci-staging.yml` runs
**Then** the same lint/test/build steps run
**And** on success, the app is deployed to staging
**And** a smoke test (`GET /api/v1/health`) is run against staging and must return HTTP 200

**Given** a PR is merged to `main`
**When** `ci-prod.yml` runs
**Then** lint/test/build steps run as before
**And** a manual approval step is required before deployment proceeds
**And** on approval, the app is deployed to production via ECS rolling update

**Given** any ECS deployment fails
**When** the rollback step runs
**Then** the previous ECS task definition revision is redeployed automatically
**And** a failure notification is sent (GitHub Actions summary)
