---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-18'
inputDocuments: ['requirements-from-user-conversation']
workflowType: 'architecture'
project_name: 'lms-app'
user_name: 'Bang'
date: '2026-04-18'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**

| Category | Requirements |
|----------|-------------|
| Identity & Access | User registration/login, role-based access (Student, Teacher, Admin), JWT auth |
| Content Hierarchy | Course → Lesson → Exercise → Assessment (4-level deep model) |
| Student Experience | Course enrollment, learning path progress, exercise submission, assessment results |
| Teacher Tools | Course/Lesson/Exercise/Assessment CRUD, student progress visibility, dashboards |
| Admin Controls | User management, system settings, role assignment |
| Course Catalog | 6 initial courses: Pronunciation, Vocabulary to Speak, Grammar to Speak, Essential Writing, IELTS Writing, IELTS Speaking |
| Media Handling | Audio/media content (especially Pronunciation course) — file upload & storage |

**Non-Functional Requirements:**

| NFR | Requirement |
|-----|-------------|
| Scalability | System must support user and content growth without re-architecture |
| Performance | Sub-200ms API p95, fast Next.js SSR/SSG page loads |
| Security | RBAC, secrets management, environment isolation, HTTPS everywhere |
| Maintainability | Modular codebase, clean separation of concerns, documented APIs |
| Availability | Production: high availability (multi-AZ), staging/dev: cost-optimized |
| Deployability | Automated CI/CD with rollback capability, zero-downtime deploys |
| Future-Readiness | CDN, caching layer, microservices decomposition path all must be addable |

**Scale & Complexity:**

- **Primary domain:** Full-stack educational platform (LMS)
- **Complexity level:** Medium-High (multi-role, content hierarchy, media, 3-env infra)
- **Estimated architectural components:** 12–15 (API, Frontend, DB, Cache, CDN, Storage, Auth, CI/CD, VPC, ALB, ECS, RDS, Secrets)

### Technical Constraints & Dependencies

- **Stack is fixed:** Flask (Python), Next.js, MySQL — no flexibility here
- **Cloud is fixed:** AWS (3 environments)
- **CI/CD is fixed:** GitHub Actions
- **Environments:** dev, staging, prod — must be isolated and reproducible
- **MySQL (not PostgreSQL):** limits some JSON query features; use SQLAlchemy ORM to abstract
- **Flask (not FastAPI):** synchronous by default — important for I/O-heavy operations (use connection pooling, consider Celery for async tasks later)

### Cross-Cutting Concerns Identified

| Concern | Architectural Impact |
|---------|---------------------|
| Authentication | JWT middleware applied globally; refresh token strategy needed |
| Authorization | RBAC decorator pattern on all API routes |
| Secrets Management | AWS Secrets Manager + Parameter Store, never hardcoded |
| Logging | Structured JSON logging to CloudWatch across all services |
| Error Handling | Standardized API error response format (RFC 7807 Problem Details) |
| Media Storage | S3 + CloudFront CDN for all course media assets |
| DB Migrations | Flask-Migrate (Alembic) — migration files version-controlled |
| Environment Config | Per-environment .env files + AWS SSM Parameter Store |
| CORS | Configured per-environment (strict in prod, permissive in dev) |

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (LMS) — Monorepo with separate frontend and backend services, coordinated via GitHub Actions CI/CD.

### Project Structure Decision: Monorepo

**Rationale:** Single repo containing `frontend/` and `backend/` keeps CI/CD simple, enables atomic commits across layers, and reduces overhead for a small-to-medium team.

```
lms-app/
├── frontend/          # Next.js application
├── backend/           # Flask API
├── .github/
│   └── workflows/     # GitHub Actions CI/CD
├── docker-compose.yml # Local dev orchestration
└── README.md
```

---

### Frontend Starter: `create-next-app`

**Initialization Command:**

```bash
npx create-next-app@latest frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**Architectural Decisions Provided:**

| Decision | Choice | Why |
|----------|--------|-----|
| Language | TypeScript | Type safety, better IDE support, fewer runtime errors |
| Routing | App Router (Next.js 15) | Server Components, layouts, streaming — modern default |
| Styling | Tailwind CSS | Utility-first, fast iteration, great for dashboards |
| Linting | ESLint + Next.js config | Enforced code quality from day one |
| Structure | `src/` directory | Clean separation of app code from config files |

**Project Structure (Frontend):**

```
frontend/src/
├── app/
│   ├── (auth)/        # Auth group: login, register
│   ├── (student)/     # Student dashboard routes
│   ├── (teacher)/     # Teacher dashboard routes
│   ├── (admin)/       # Admin panel routes
│   └── api/           # Next.js API routes (BFF layer if needed)
├── components/        # Reusable UI components
├── lib/               # Utilities, API client, auth helpers
├── hooks/             # Custom React hooks
└── types/             # TypeScript type definitions
```

---

### Backend Starter: Flask Application Factory + Blueprints

**Project Structure (Backend):**

```
backend/
├── app/
│   ├── __init__.py         # Application factory (create_app())
│   ├── config.py           # Environment-based config classes
│   ├── extensions.py       # SQLAlchemy, Migrate, JWT init
│   ├── api/
│   │   └── v1/
│   │       ├── auth/       # Blueprint: /api/v1/auth
│   │       ├── courses/    # Blueprint: /api/v1/courses
│   │       ├── lessons/    # Blueprint: /api/v1/lessons
│   │       ├── exercises/  # Blueprint: /api/v1/exercises
│   │       ├── assessments/# Blueprint: /api/v1/assessments
│   │       └── users/      # Blueprint: /api/v1/users
│   ├── models/             # SQLAlchemy models
│   ├── services/           # Business logic layer
│   └── middleware/         # Auth, CORS, error handlers
├── migrations/             # Flask-Migrate (Alembic) files
├── tests/
│   ├── unit/
│   └── integration/
├── requirements/
│   ├── base.txt
│   ├── dev.txt
│   └── prod.txt
├── Dockerfile
├── gunicorn.conf.py
└── wsgi.py
```

**Core Python Dependencies:**

```
Flask==3.x
Flask-SQLAlchemy==3.x
Flask-Migrate==4.x
Flask-JWT-Extended==4.x
Flask-CORS==4.x
PyMySQL==1.x
marshmallow==3.x
gunicorn==21.x
python-dotenv==1.x
```

**Note:** Project initialization using these commands is the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- JWT authentication strategy with RBAC
- REST API versioning and error contract
- AWS ECS Fargate as compute platform
- RDS MySQL as managed database
- Environment isolation via separate VPCs per environment

**Important Decisions (Shape Architecture):**
- TanStack Query + Zustand for frontend state
- Redis (ElastiCache) for caching and session storage
- S3 + CloudFront for media and static assets
- GitHub Actions as CI/CD orchestrator

**Deferred Decisions (Post-MVP):**
- Celery + SQS for async task processing (email notifications, batch grading)
- Elasticsearch for course content search
- Microservice decomposition (start monolith, extract when needed)
- WebSocket support for real-time collaboration

---

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| ORM | SQLAlchemy 2.x | Abstracts MySQL specifics; Unit of Work pattern |
| Migrations | Flask-Migrate (Alembic) | Version-controlled schema changes |
| Serialization | marshmallow 3.x | Strict input validation + output schema |
| Caching | Redis via AWS ElastiCache | Session storage, API response cache, rate-limit counters |
| Cache Strategy | Cache-aside | Simple, explicit; cache course/lesson reads; invalidate on write |
| Connection Pooling | SQLAlchemy pool (size=10, max_overflow=20) | Prevents DB connection exhaustion under load |

**Domain Model (Relational):**

```
users ──< enrollments >── courses ──< lessons ──< exercises ──< assessments
users ──< submissions (exercise/assessment results)
users ──< progress_tracking (per lesson)
courses ──< course_media (S3 references)
```

---

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Auth Mechanism | JWT (Flask-JWT-Extended) | Stateless, scales horizontally |
| Token Strategy | Access token (15min) + Refresh token (7 days) | Balance security & UX |
| Authorization | RBAC via custom Flask decorators | `@require_role('teacher')` on routes |
| Password Hashing | bcrypt (via Flask-Bcrypt) | Industry standard, adaptive cost |
| Secrets Storage | AWS Secrets Manager | Rotatable, auditable, never in code or env files in prod |
| HTTPS | ACM certificates + ALB termination | TLS 1.2+ enforced; HTTP redirected to HTTPS |
| CORS | Flask-CORS per-environment config | Strict origin whitelist in staging/prod |
| Rate Limiting | Flask-Limiter + Redis backend | 100 req/min per IP; 20 req/min on auth endpoints |

---

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Style | RESTful, versioned at `/api/v1/` | Simple, well-understood, easy to evolve |
| Response Format | JSON with consistent envelope | `{"data": ..., "meta": ..., "error": ...}` |
| Error Standard | RFC 7807 Problem Details | Machine-readable, structured error contract |
| Documentation | flasgger (Swagger/OpenAPI 3.0) | Auto-generated from docstrings; `/api/docs` endpoint |
| Pagination | Cursor-based for lists | Stable under concurrent writes (course/lesson lists) |
| File Uploads | Presigned S3 URLs | Backend generates presigned URL; client uploads direct to S3 |
| API Versioning | URL prefix (`/api/v1/`) | Simple, explicit; v2 coexists when needed |

**Standard Response Envelope:**

```json
{
  "data": {},
  "meta": { "page": 1, "total": 100 },
  "error": null
}
```

---

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Server State | TanStack Query (React Query) v5 | Caching, background refetch, loading/error states |
| Client State | Zustand | Lightweight; auth state, UI state only |
| Component Library | shadcn/ui + Tailwind CSS | Accessible, unstyled-base, fully ownable |
| Forms | React Hook Form + Zod | Type-safe validation matching backend schemas |
| Rendering Strategy | SSR for dashboards; SSG for course catalog | SEO for catalog; fresh data for dashboards |
| API Client | Axios with interceptors | JWT injection, 401 refresh token logic, error normalization |
| Auth Storage | httpOnly cookie for refresh token; memory for access token | Prevents XSS token theft |
| Code Splitting | Next.js automatic + dynamic imports for heavy editors | Minimal initial bundle |

---

### Infrastructure & Deployment

#### Compute

| Component | Service | Reasoning |
|-----------|---------|-----------|
| Backend API | AWS ECS Fargate | Managed containers; no EC2 maintenance; auto-scaling |
| Frontend | AWS ECS Fargate | Containerized Next.js with SSR support |
| Database | AWS RDS MySQL 8.x | Managed, automated backups, Multi-AZ in prod |
| Cache | AWS ElastiCache (Redis 7.x) | Managed Redis; session + cache + rate-limit |
| Media/Assets | AWS S3 + CloudFront | Low-latency global CDN for audio/video/images |
| Load Balancer | AWS ALB | Path-based routing; `/api/*` → backend, `/*` → frontend |
| Secrets | AWS Secrets Manager + SSM | Centralized, rotatable, per-environment |
| Logging | AWS CloudWatch Logs | Structured JSON logs from all containers |
| Monitoring | CloudWatch Metrics + Alarms | CPU, memory, error rate, DB connections |

#### Environment Architecture

```
                    ┌─────────────────────────────┐
                    │         GitHub Repo          │
                    │  main     → prod deploy      │
                    │  staging  → staging deploy   │
                    │  develop  → dev deploy       │
                    └────────────┬────────────────┘
                                 │ GitHub Actions
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
   ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
   │     DEV     │       │   STAGING   │       │    PROD     │
   │  VPC (dev)  │       │ VPC (stag)  │       │ VPC (prod)  │
   │  ECS (1 AZ) │       │  ECS (1 AZ) │       │ ECS (2 AZ)  │
   │  RDS (1 AZ) │       │  RDS (1 AZ) │       │ RDS Multi-AZ│
   │  Redis (1)  │       │  Redis (1)  │       │  Redis (1)  │
   │  t3.small   │       │  t3.small   │       │  t3.medium+ │
   └─────────────┘       └─────────────┘       └─────────────┘
```

#### Deployment Strategy

| Strategy | Detail |
|----------|--------|
| Deploy Method | ECS rolling deployment (zero-downtime) |
| Rollback | Previous ECS task definition revision (automated in Actions) |
| DB Migrations | Run as ECS one-off task before service update |
| Blue/Green (future) | AWS CodeDeploy ECS integration when traffic warrants it |
| Branch Strategy | PR required for staging; manual approval gate for prod |

#### CI/CD Pipeline (GitHub Actions)

```
On PR → develop:     lint → test → build → deploy (dev)
On merge → staging:  lint → test → build → deploy (staging) → smoke test
On merge → main:     lint → test → build → [manual approval] → deploy (prod)
```

### Decision Impact Analysis

**Implementation Sequence:**
1. Local dev environment (Docker Compose: Flask + MySQL + Redis + Next.js)
2. Database schema + migrations
3. Auth system (JWT + RBAC)
4. Core API blueprints (courses → lessons → exercises → assessments)
5. Frontend auth flow + role-based routing
6. Student + Teacher dashboards
7. Media upload (S3 presigned URLs)
8. AWS infrastructure (ECS, RDS, ElastiCache, ALB, CloudFront)
9. CI/CD pipelines

**Cross-Component Dependencies:**
- JWT secret must exist in Secrets Manager before any service deploys
- RDS must be provisioned before backend ECS tasks start
- ElastiCache must be in same VPC as ECS tasks
- CloudFront distribution URL needed before frontend build (env var)
- ALB target groups must register ECS services before DNS cutover

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

8 areas where inconsistent decisions between developers/agents would break the system:
naming conventions, response formats, error handling, file structure, auth patterns,
state management, test organization, and date/time handling.

---

### Naming Patterns

#### Database Naming Conventions

| Rule | Convention | Example |
|------|-----------|---------|
| Table names | `snake_case`, plural | `users`, `course_lessons`, `progress_tracking` |
| Column names | `snake_case` | `created_at`, `user_id`, `is_active` |
| Primary keys | `id` (auto-increment INT) | `id` |
| Foreign keys | `{table_singular}_id` | `user_id`, `course_id`, `lesson_id` |
| Indexes | `idx_{table}_{column}` | `idx_users_email`, `idx_enrollments_user_id` |
| Junction tables | `{table1}_{table2}` alphabetical | `course_enrollments`, `user_roles` |
| Boolean columns | `is_` or `has_` prefix | `is_active`, `is_published`, `has_passed` |
| Timestamp columns | `created_at`, `updated_at`, `deleted_at` | Always UTC, DATETIME type |

#### API Naming Conventions

| Rule | Convention | Example |
|------|-----------|---------|
| Resource names | plural `snake_case` | `/api/v1/courses`, `/api/v1/course_lessons` |
| URL path params | Flask `<type:name>` | `/api/v1/courses/<int:course_id>` |
| Query params | `snake_case` | `?page=1&per_page=20&sort_by=created_at` |
| HTTP methods | Standard REST | `GET` list/detail, `POST` create, `PUT` full update, `PATCH` partial, `DELETE` |
| Nested resources | Max 2 levels deep | `/api/v1/courses/<id>/lessons` — no deeper |
| Action endpoints | verb after resource | `/api/v1/courses/<id>/publish`, `/api/v1/auth/refresh` |

#### Code Naming Conventions

**Backend (Python — PEP 8):**

| Element | Convention | Example |
|---------|-----------|---------|
| Files/modules | `snake_case` | `course_service.py`, `auth_middleware.py` |
| Classes | `PascalCase` | `CourseService`, `UserModel` |
| Functions/methods | `snake_case` | `get_course_by_id()`, `validate_token()` |
| Variables | `snake_case` | `course_list`, `current_user` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_FILE_SIZE`, `JWT_EXPIRY_MINUTES` |
| Private methods | `_snake_case` prefix | `_hash_password()`, `_validate_schema()` |

**Frontend (TypeScript — Airbnb style):**

| Element | Convention | Example |
|---------|-----------|---------|
| Component files | `PascalCase.tsx` | `CourseCard.tsx`, `LessonList.tsx` |
| Non-component files | `camelCase.ts` | `courseApi.ts`, `useAuth.ts` |
| Components | `PascalCase` | `CourseCard`, `StudentDashboard` |
| Functions/hooks | `camelCase` | `getCourseById()`, `useEnrollment()` |
| Custom hooks | `use` prefix | `useAuth`, `useCourseProgress` |
| Constants | `UPPER_SNAKE_CASE` | `API_BASE_URL`, `MAX_FILE_SIZE` |
| Types/Interfaces | `PascalCase` | `CourseType`, `UserProfile` |
| Zustand stores | `use{Name}Store` | `useAuthStore`, `useCourseStore` |

---

### Structure Patterns

#### Backend File Organization

```
# Each API blueprint follows this structure:
app/api/v1/{resource}/
├── __init__.py       # Blueprint registration
├── routes.py         # Route definitions only (thin controllers)
└── schemas.py        # marshmallow request/response schemas

# Business logic always in services layer:
app/services/
├── course_service.py
├── auth_service.py

app/models/
├── user.py           # One model per file
├── course.py
```

#### Frontend File Organization

```
# Feature-based component organization:
components/
├── ui/               # Atomic: Button, Input, Badge (shadcn/ui wrappers)
├── common/           # Shared: Navbar, Sidebar, PageLoader
├── courses/          # Feature components
├── lessons/
├── exercises/
└── dashboard/

# Tests co-located with components:
components/courses/
├── CourseCard.tsx
├── CourseCard.test.tsx
└── index.ts           # Barrel export
```

#### Test Organization

| Layer | Location | Type |
|-------|----------|------|
| Backend unit | `backend/tests/unit/` | Service/model logic |
| Backend integration | `backend/tests/integration/` | API routes with test DB |
| Frontend unit | Co-located `*.test.tsx` | Component rendering |
| Frontend E2E | `frontend/e2e/` | Playwright (future) |

---

### Format Patterns

#### API Response Envelope — ALL endpoints MUST use this format

```json
// Success (list):
{ "data": [...], "meta": { "page": 1, "per_page": 20, "total": 150 }, "error": null }

// Success (single):
{ "data": { "id": 1, "title": "..." }, "meta": null, "error": null }

// Error (RFC 7807):
{ "data": null, "meta": null, "error": { "type": "VALIDATION_ERROR", "title": "Invalid request", "detail": "email is required", "status": 422 } }
```

#### JSON Field Naming

| Context | Convention | Handling |
|---------|-----------|---------|
| API request/response | `snake_case` | Python/MySQL native |
| Frontend TypeScript | `camelCase` | JS convention |
| Conversion | Auto via Axios interceptor | `snake_case` in ↔ `camelCase` out |

#### Date/Time Format

- **All timestamps:** ISO 8601 UTC — `"2026-04-18T10:30:00Z"`
- **Database:** `DATETIME` columns, UTC always
- **Display:** Format in frontend using `date-fns`
- **Never:** Unix timestamps in API; never local time in DB

#### HTTP Status Codes

| Code | Use |
|------|-----|
| 200 | GET, PUT, PATCH success |
| 201 | POST success (created) |
| 204 | DELETE success |
| 400 | Bad request |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Not found |
| 422 | Schema validation error |
| 429 | Rate limited |
| 500 | Server error |

---

### Communication Patterns

#### State Management (Frontend)

```typescript
// Zustand: CLIENT state only (auth, UI, modals)
// TanStack Query: ALL server state (courses, lessons, progress)

// ✅ Server data in TanStack Query:
const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: fetchCourses })

// ✅ Auth in Zustand:
const { user, setUser } = useAuthStore()

// ❌ Never server data in Zustand
```

#### TanStack Query Key Convention

```typescript
['courses']                      // all courses
['courses', courseId]            // single course
['courses', courseId, 'lessons'] // lessons for a course
['users', userId, 'progress']    // user progress
```

---

### Process Patterns

#### Error Handling

```python
# Backend: ALL errors through centralized handler — never return errors directly from routes
# Raise custom exceptions: NotFoundError, UnauthorizedError, ValidationError
# Centralized handler in app/middleware/error_handlers.py converts to RFC 7807 format
```

```typescript
// Frontend: errors surface via TanStack Query error state
// User-facing: toast notifications via single ToastProvider
```

#### Loading States

```typescript
// Always use TanStack Query isLoading — never manual loading booleans
// Skeleton loaders for content; spinner for button actions

// ✅ Correct:
const { data, isLoading } = useQuery(...)
if (isLoading) return <CourseSkeleton />
```

#### Authentication Flow

```
Access token  → memory (Zustand) — cleared on page refresh
Refresh token → httpOnly cookie — persists across refreshes
On 401        → Axios interceptor auto-calls /api/v1/auth/refresh → retry
On refresh failure → redirect to /login, clear auth store
```

---

### Enforcement Guidelines

**All developers/agents MUST:**

- Use `snake_case` for all DB columns and API JSON fields
- Use the standard response envelope for every API response
- Use ISO 8601 UTC for all timestamps
- Never access DB directly from routes — always through services
- Never store tokens in localStorage or sessionStorage
- Co-locate frontend tests with component files
- Register every Flask blueprint in `app/__init__.py`
- Use marshmallow schemas for all request validation

**Anti-Patterns (Never Do These):**

```python
# ❌ Direct DB in routes — put in service layer:
courses = Course.query.all()  # in a route function

# ✅ Correct:
return course_service.get_all_courses()
```

```typescript
// ❌ Server data in Zustand store
// ✅ Server data in TanStack Query
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
lms-app/                                    # Monorepo root
├── .github/
│   └── workflows/
│       ├── ci-dev.yml                      # PR → develop: lint, test, build, deploy dev
│       ├── ci-staging.yml                  # Merge → staging: lint, test, build, deploy staging
│       └── ci-prod.yml                     # Merge → main: lint, test, build, approve, deploy prod
├── frontend/                               # Next.js 15 application
│   ├── .env.example
│   ├── .env.local                          # Git-ignored; dev local overrides
│   ├── .eslintrc.json
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── public/
│   │   └── assets/
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                    # Landing/marketing page (SSG)
│       │   ├── globals.css
│       │   ├── (auth)/
│       │   │   ├── login/page.tsx
│       │   │   └── register/page.tsx
│       │   ├── (student)/
│       │   │   ├── layout.tsx
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── courses/
│       │   │   │   ├── page.tsx            # Course catalog (SSG/ISR)
│       │   │   │   └── [courseId]/
│       │   │   │       ├── page.tsx
│       │   │   │       └── lessons/
│       │   │   │           └── [lessonId]/
│       │   │   │               ├── page.tsx
│       │   │   │               ├── exercises/[exerciseId]/page.tsx
│       │   │   │               └── assessment/page.tsx
│       │   │   └── progress/page.tsx
│       │   ├── (teacher)/
│       │   │   ├── layout.tsx
│       │   │   ├── dashboard/page.tsx
│       │   │   └── courses/
│       │   │       ├── page.tsx
│       │   │       ├── new/page.tsx
│       │   │       └── [courseId]/
│       │   │           ├── page.tsx
│       │   │           ├── lessons/
│       │   │           │   ├── new/page.tsx
│       │   │           │   └── [lessonId]/
│       │   │           │       ├── page.tsx
│       │   │           │       ├── exercises/
│       │   │           │       │   ├── new/page.tsx
│       │   │           │       │   └── [exerciseId]/page.tsx
│       │   │           │       └── assessment/page.tsx
│       │   │           └── students/page.tsx
│       │   └── (admin)/
│       │       ├── layout.tsx
│       │       ├── dashboard/page.tsx
│       │       ├── users/
│       │       │   ├── page.tsx
│       │       │   └── [userId]/page.tsx
│       │       └── settings/page.tsx
│       ├── components/
│       │   ├── ui/                         # shadcn/ui base components
│       │   │   ├── button.tsx
│       │   │   ├── input.tsx
│       │   │   ├── card.tsx
│       │   │   ├── badge.tsx
│       │   │   ├── skeleton.tsx
│       │   │   └── toast.tsx
│       │   ├── common/
│       │   │   ├── Navbar.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── PageLoader.tsx
│       │   │   ├── ErrorBoundary.tsx
│       │   │   └── ToastProvider.tsx
│       │   ├── auth/
│       │   │   ├── LoginForm.tsx
│       │   │   ├── LoginForm.test.tsx
│       │   │   ├── RegisterForm.tsx
│       │   │   └── index.ts
│       │   ├── courses/
│       │   │   ├── CourseCard.tsx
│       │   │   ├── CourseCard.test.tsx
│       │   │   ├── CourseList.tsx
│       │   │   ├── CourseEditor.tsx
│       │   │   ├── EnrollButton.tsx
│       │   │   └── index.ts
│       │   ├── lessons/
│       │   │   ├── LessonPlayer.tsx        # Audio/video for Pronunciation course
│       │   │   ├── LessonNav.tsx
│       │   │   ├── LessonEditor.tsx
│       │   │   └── index.ts
│       │   ├── exercises/
│       │   │   ├── ExerciseForm.tsx
│       │   │   ├── ExerciseResult.tsx
│       │   │   ├── ExerciseEditor.tsx
│       │   │   └── index.ts
│       │   ├── assessments/
│       │   │   ├── AssessmentForm.tsx
│       │   │   ├── AssessmentResult.tsx
│       │   │   └── index.ts
│       │   ├── dashboard/
│       │   │   ├── StudentProgressCard.tsx
│       │   │   ├── CourseProgressBar.tsx
│       │   │   ├── TeacherStatsCard.tsx
│       │   │   └── index.ts
│       │   └── media/
│       │       ├── AudioPlayer.tsx
│       │       ├── FileUpload.tsx          # S3 presigned URL uploader
│       │       └── index.ts
│       ├── lib/
│       │   ├── api/
│       │   │   ├── client.ts               # Axios + interceptors (JWT inject, snake↔camel)
│       │   │   ├── auth.ts
│       │   │   ├── courses.ts
│       │   │   ├── lessons.ts
│       │   │   ├── exercises.ts
│       │   │   ├── assessments.ts
│       │   │   ├── users.ts
│       │   │   └── media.ts
│       │   ├── stores/
│       │   │   ├── authStore.ts            # Zustand: user, tokens, role
│       │   │   └── uiStore.ts              # Zustand: sidebar, modals
│       │   ├── schemas/
│       │   │   ├── courseSchema.ts         # Zod validation (mirror backend marshmallow)
│       │   │   ├── lessonSchema.ts
│       │   │   └── authSchema.ts
│       │   └── utils/
│       │       ├── formatDate.ts
│       │       ├── roleGuard.ts
│       │       └── queryKeys.ts            # Centralized TanStack Query keys
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   ├── useCourses.ts
│       │   ├── useLessons.ts
│       │   ├── useProgress.ts
│       │   └── useMediaUpload.ts
│       ├── types/
│       │   ├── api.ts                      # Response envelope types
│       │   ├── user.ts
│       │   ├── course.ts
│       │   ├── lesson.ts
│       │   ├── exercise.ts
│       │   └── assessment.ts
│       └── middleware.ts                   # Next.js middleware: auth redirect + role guard
├── backend/                                # Flask API
│   ├── .env.example
│   ├── .flake8
│   ├── Dockerfile
│   ├── gunicorn.conf.py
│   ├── wsgi.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── dev.txt                         # + pytest, black, flake8, factory-boy
│   │   └── prod.txt                        # + gunicorn, sentry-sdk
│   ├── migrations/
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   └── versions/
│   ├── app/
│   │   ├── __init__.py                     # create_app() factory
│   │   ├── config.py                       # DevelopmentConfig, StagingConfig, ProductionConfig
│   │   ├── extensions.py                   # db, migrate, jwt, cors, limiter instances
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── __init__.py             # Register all blueprints
│   │   │       ├── auth/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── routes.py           # POST /login /register /refresh /logout
│   │   │       │   └── schemas.py
│   │   │       ├── users/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── routes.py
│   │   │       │   └── schemas.py
│   │   │       ├── courses/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── routes.py           # CRUD + /enroll + /publish
│   │   │       │   └── schemas.py
│   │   │       ├── lessons/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── routes.py           # CRUD + /complete
│   │   │       │   └── schemas.py
│   │   │       ├── exercises/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── routes.py           # CRUD + /submit
│   │   │       │   └── schemas.py
│   │   │       ├── assessments/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── routes.py           # CRUD + /submit + /grade
│   │   │       │   └── schemas.py
│   │   │       ├── progress/
│   │   │       │   ├── __init__.py
│   │   │       │   ├── routes.py           # GET /progress/me, /progress/<user_id>
│   │   │       │   └── schemas.py
│   │   │       └── media/
│   │   │           ├── __init__.py
│   │   │           ├── routes.py           # POST /media/presigned-url
│   │   │           └── schemas.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                     # User, Role, UserRole
│   │   │   ├── course.py                   # Course, CourseEnrollment
│   │   │   ├── lesson.py                   # Lesson, LessonProgress
│   │   │   ├── exercise.py                 # Exercise, ExerciseSubmission
│   │   │   ├── assessment.py               # Assessment, AssessmentSubmission
│   │   │   └── media.py                    # CourseMedia (S3 refs)
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── course_service.py
│   │   │   ├── lesson_service.py
│   │   │   ├── exercise_service.py
│   │   │   ├── assessment_service.py
│   │   │   ├── progress_service.py
│   │   │   └── media_service.py            # S3 presigned URL generation
│   │   └── middleware/
│   │       ├── auth_middleware.py          # JWT verification decorator
│   │       ├── rbac.py                     # @require_role() decorator
│   │       ├── error_handlers.py           # RFC 7807 centralized errors
│   │       └── request_logger.py           # Structured JSON request logging
│   └── tests/
│       ├── conftest.py                     # pytest fixtures: test app, test DB, factories
│       ├── unit/
│       │   ├── services/
│       │   │   ├── test_auth_service.py
│       │   │   ├── test_course_service.py
│       │   │   └── ...
│       │   └── models/
│       └── integration/
│           ├── test_auth_routes.py
│           ├── test_course_routes.py
│           └── ...
├── infrastructure/
│   └── terraform/
│       ├── modules/
│       │   ├── vpc/
│       │   ├── ecs/
│       │   ├── rds/
│       │   ├── elasticache/
│       │   ├── alb/
│       │   ├── s3_cloudfront/
│       │   └── secrets/
│       ├── environments/
│       │   ├── dev/
│       │   │   ├── main.tf
│       │   │   └── terraform.tfvars
│       │   ├── staging/
│       │   │   ├── main.tf
│       │   │   └── terraform.tfvars
│       │   └── prod/
│       │       ├── main.tf
│       │       └── terraform.tfvars
│       └── shared/
│           └── backend.tf                  # S3 remote state
└── docker-compose.yml                      # Local dev orchestration
```

---

### Architectural Boundaries

#### Traffic Flow

```
Internet
    │
    ▼
CloudFront (cdn.lms.com)     ← Static assets + media from S3
    │
ALB (lms.com)
    ├── /api/*  → Backend ECS (Flask:5000)
    └── /*      → Frontend ECS (Next.js:3000)
                      │
                      └── SSR → Backend ECS (internal VPC only)
```

#### Endpoint Authorization Boundary

| Scope | Endpoint Pattern | Auth |
|-------|-----------------|------|
| Public | `GET /api/v1/courses` (catalog) | None |
| Authenticated | All other `/api/v1/*` | JWT Bearer |
| Student-only | `/progress`, `/submit` endpoints | Role: student |
| Teacher-only | `POST/PUT/DELETE /courses/*` | Role: teacher |
| Admin-only | `/api/v1/users` (list/manage) | Role: admin |

#### Data Flow Examples

```
Student submits exercise:
  Browser → POST /api/v1/exercises/<id>/submit
    → auth_middleware (JWT verify) → rbac (student)
    → ExerciseService.submit_answer() → MySQL (save) + Redis (invalidate cache)
    → Return graded result

Teacher uploads audio:
  Browser → POST /api/v1/media/presigned-url → S3 presigned URL (5min)
  Browser → upload directly to S3
  Browser → PATCH /lessons/<id> with S3 key
```

---

### Requirements to Structure Mapping

| Feature | Backend Location | Frontend Location |
|---------|-----------------|-------------------|
| Auth | `api/v1/auth/` + `services/auth_service.py` | `(auth)/` + `components/auth/` + `authStore.ts` |
| Course catalog | `api/v1/courses/` + `services/course_service.py` | `(student)/courses/` + `components/courses/` |
| Lesson player | `api/v1/lessons/` | `lessons/[lessonId]/` + `LessonPlayer.tsx` |
| Exercises | `api/v1/exercises/` | `components/exercises/ExerciseForm.tsx` |
| Assessments | `api/v1/assessments/` | `components/assessments/` |
| Progress | `api/v1/progress/` + `services/progress_service.py` | `hooks/useProgress.ts` + `dashboard/` |
| Teacher CRUD | Same API, teacher role | `(teacher)/` routes + editor components |
| Media/audio | `api/v1/media/` + `services/media_service.py` | `hooks/useMediaUpload.ts` + `AudioPlayer.tsx` |
| Admin | `api/v1/users/` (admin scope) | `(admin)/users/` |

### Development Workflow Integration

**Local dev (docker-compose.yml):**
- MySQL 8.x → port 3306
- Redis 7.x → port 6379
- Flask (hot-reload) → port 5000
- Next.js (HMR) → port 3000

**Secrets management per environment:**
- Local: `.env.local` (git-ignored)
- Dev/Staging/Prod: AWS Secrets Manager + SSM Parameter Store (never in files)

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are version-compatible and interoperate without conflicts:
- Flask 3.x + SQLAlchemy 2.x + Flask-Migrate 4.x + PyMySQL 1.x: confirmed compatible
- Flask-JWT-Extended 4.x + Flask-CORS 4.x + Flask-Limiter 3.x: no conflicts
- Next.js 15 + TanStack Query v5 + Zustand 5.x + Tailwind 3.x: confirmed compatible
- AWS ECS Fargate + RDS MySQL 8.x + ElastiCache Redis 7.x + ALB: standard AWS stack

**Pattern Consistency:**
- PEP 8 backend naming aligns with marshmallow/SQLAlchemy conventions
- Frontend camelCase aligns with TypeScript/React conventions
- Axios interceptor bridges the snake_case ↔ camelCase boundary cleanly
- Service layer pattern is consistent across all 8 API domains

**Structure Alignment:**
- Every blueprint has a corresponding service, model, and schema file
- Frontend route groups `(auth)`, `(student)`, `(teacher)`, `(admin)` map 1:1 to role boundaries
- Terraform modules mirror AWS service boundaries

---

### Requirements Coverage Validation ✅

**Functional Requirements:**

| Feature | Architectural Support | Status |
|---------|----------------------|--------|
| User auth (login/register/JWT) | `api/v1/auth/` + `auth_service.py` + JWT middleware | ✅ |
| RBAC (student/teacher/admin) | `@require_role()` decorator + `user_roles` table | ✅ |
| Course CRUD | `api/v1/courses/` + `course_service.py` | ✅ |
| Lesson management | `api/v1/lessons/` + `lesson_service.py` | ✅ |
| Exercise submission | `api/v1/exercises/` + `ExerciseSubmission` model | ✅ |
| Assessment + grading | `api/v1/assessments/` + `/grade` endpoint | ✅ |
| Progress tracking | `api/v1/progress/` + `LessonProgress` model | ✅ |
| Audio/media (Pronunciation) | S3 presigned URLs + `AudioPlayer.tsx` + `media_service.py` | ✅ |
| Student dashboard | `(student)/dashboard/` + `useCourses` + `useProgress` hooks | ✅ |
| Teacher dashboard | `(teacher)/dashboard/` + student progress endpoints | ✅ |
| Admin user management | `(admin)/users/` + admin-scoped user endpoints | ✅ |
| Course catalog (6 courses) | SSG course catalog + S3 content storage | ✅ |

**Non-Functional Requirements:**

| NFR | Architectural Solution | Status |
|-----|----------------------|--------|
| Scalability | ECS auto-scaling, Redis cache-aside, Multi-AZ RDS | ✅ |
| Performance | CloudFront CDN, Redis API cache, SSG catalog, connection pooling | ✅ |
| Security | JWT + RBAC, Secrets Manager, HTTPS/ACM, rate limiting, httpOnly cookies | ✅ |
| Maintainability | Blueprint modularity, service layer, naming conventions, test structure | ✅ |
| Availability | Multi-AZ prod (ECS + RDS), rolling deploys, health checks | ✅ |
| Deployability | GitHub Actions, ECS rolling deploy, task-definition rollback | ✅ |
| Future-Readiness | Service layer ready for extraction, Redis in place for queue, CDN live from day 1 | ✅ |

---

### Gap Analysis Results

**Critical Gaps:** None identified.

**Minor Gaps (resolved during validation):**

1. **Health check endpoint** — `GET /api/v1/health` (no auth required) must be implemented for ECS target group health checks and ALB registration.
2. **DB seeding for dev** — Flask CLI command `flask seed-db` in `wsgi.py` for populating local development data (sample courses, test users per role).

**Nice-to-Have (deferred, not blocking):**
- Prometheus metrics endpoint for future Grafana dashboards
- OpenAPI schema export for SDK generation
- Storybook for component documentation

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context analyzed — domain, scale, constraints
- [x] Functional requirements mapped to components
- [x] Non-functional requirements addressed architecturally
- [x] Cross-cutting concerns identified and assigned

**✅ Architectural Decisions**
- [x] Data architecture (SQLAlchemy 2.x, Redis, migrations)
- [x] Auth & security (JWT, RBAC, Secrets Manager, rate limiting)
- [x] API design (REST, versioned, RFC 7807 errors, Swagger docs)
- [x] Frontend architecture (TanStack Query, Zustand, shadcn/ui, SSR/SSG)
- [x] Infrastructure (ECS Fargate, RDS, ElastiCache, ALB, S3/CloudFront)
- [x] CI/CD (GitHub Actions, 3-environment pipeline, manual prod gate)

**✅ Implementation Patterns**
- [x] Database naming conventions
- [x] API naming conventions
- [x] Backend code naming (PEP 8)
- [x] Frontend code naming (Airbnb TS)
- [x] Response envelope format
- [x] Error handling (RFC 7807)
- [x] Auth flow pattern
- [x] State management boundaries
- [x] Anti-patterns documented

**✅ Project Structure**
- [x] Complete monorepo directory tree
- [x] Frontend App Router structure (all role groups)
- [x] Backend blueprint + service + model structure
- [x] Infrastructure Terraform modules + environments
- [x] CI/CD workflow files
- [x] Requirements-to-files mapping

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
- Domain model (Course→Lesson→Exercise→Assessment) maps directly to API blueprints and DB tables
- Role-based routing fully designed at both API and frontend levels
- Media strategy (S3 presigned URLs) scales to any content volume without backend bottleneck
- Three-environment Terraform strategy enables safe progressive deployments
- Patterns document is comprehensive enough to prevent developer/agent divergence

**Areas for Future Enhancement (post-MVP):**
- Celery + SQS for async grading and email notifications
- Elasticsearch for course/lesson full-text search
- WebSocket layer for live teacher-student interaction
- Microservice extraction when team scales (auth service first candidate)

---

### Implementation Handoff

**First Implementation Steps:**

```bash
# 1. Initialize monorepo
git init lms-app && cd lms-app
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
mkdir -p backend/app/{api/v1,models,services,middleware}
mkdir -p backend/tests/{unit,integration} backend/migrations backend/requirements
mkdir -p infrastructure/terraform/{modules,environments/{dev,staging,prod}}

# 2. Backend local setup
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements/dev.txt
flask db init && flask db migrate && flask db upgrade
flask seed-db

# 3. Local orchestration
docker-compose up  # MySQL + Redis + Flask + Next.js
```

**AI Agent Guidelines:**
- Follow all patterns in the "Implementation Patterns" section exactly
- Every API endpoint MUST use the standard response envelope
- Every route MUST go through a service — never query DB from routes
- Every Flask blueprint MUST be registered in `app/__init__.py`
- Every frontend feature using server data MUST use TanStack Query
