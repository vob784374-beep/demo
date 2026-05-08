# Deferred Work

## Deferred from: Makefile one-shot fix (2026-04-21)

- `make shell` assumes `bash` is present in the backend container image — `python:3.12-slim` has bash so this is safe for this project; change to `sh` if base image ever switches to Alpine.
- `make migrate` and `make test` have no guard against a stopped stack — `docker compose exec` on a stopped container fails with a cryptic error; document in README or add `depends_on` guard if this causes confusion.
- `make test` routes into the container's running stack — the pytest `testing` config uses SQLite in-memory so no dev data is at risk; revisit if a MySQL-based test config is ever added.

## Deferred from: code review of 2-5-frontend-login-and-registration-pages (2026-04-20)

- Access token stored in Zustand without validation or expiry check — a blank or malformed token is accepted silently; expiry handling deferred to a future auth-hardening story [frontend/src/lib/api/auth.ts].
- Accessibility: `aria-invalid` and `aria-describedby` not set on inputs with validation errors — screen readers won't announce field errors; accessibility pass deferred [frontend/src/components/auth/LoginForm.tsx, RegisterForm.tsx].
- Duplicate Zod schema definitions in test file (`authSchemas.test.ts`) re-define schemas independently from components — drift risk if schemas change; extract to shared module in a future refactor [frontend/src/__tests__/lib/validation/authSchemas.test.ts].
- `auth.ts` imports from `client.ts` (which has `'use client'`) but has no own `'use client'` directive — safe for now (only imported by client components); add directive defensively before any SSR usage [frontend/src/lib/api/auth.ts].
- Zustand `useAuthStore` has no persistence/rehydration middleware — full page reload clears in-memory token; recovery via refresh cookie interceptor handles it; pre-existing from Story 1.5 [frontend/src/lib/stores/authStore.ts].
- No `console.error` in form catch blocks — debugging opaque in development; no frontend logging infra defined yet [frontend/src/components/auth/LoginForm.tsx, RegisterForm.tsx].
- `setAuth` is called before `router.push` with no rollback on navigation failure — theoretical risk; Next.js `router.push` is fire-and-forget with no failure callback [frontend/src/components/auth/LoginForm.tsx, RegisterForm.tsx].
- No client-side backoff on repeated failed logins — backend enforces 20 req/min; 429 response shows generic error with no retry-after guidance [frontend/src/components/auth/LoginForm.tsx].
- `vitest.config.mts` has no coverage thresholds — `vitest --coverage` passes at 0%; enforce minimums as a project-wide CI policy decision [frontend/vitest.config.mts].
- `next/navigation` mock not configured globally in `setup.ts` — each test file mocks individually; acceptable now but fragile at scale [frontend/src/__tests__/setup.ts].
- `<h1>` inside `CardHeader` may conflict with page-level `<h1>` — heading hierarchy audit needed; change to `<h2>` once page layout is finalized [frontend/src/components/auth/LoginForm.tsx, RegisterForm.tsx].
- `processQueue` called with original 401 error instead of refresh-specific error in the "refresh succeeded but token missing" branch — pre-existing bug in `client.ts` from Story 1.5 [frontend/src/lib/api/client.ts].
- `isRefreshing` zombie state on partial refresh failure (200 with no token, non-SSR context) — pre-existing from `client.ts` Story 1.5 [frontend/src/lib/api/client.ts].
- `isActive: false` users are authenticated and redirected to dashboard without being blocked — deferred to Story 2.6 route guards [frontend/src/components/auth forms].

## Deferred from: code review of 2-4-role-based-access-control-middleware (2026-04-20)

- No `expired_token_loader` registered in `app/__init__.py` — expired access tokens return `{"msg": "Token has expired"}` (flask-jwt-extended default) instead of the project `{data, meta, error}` envelope; pre-existing from Story 2.3 [backend/app/__init__.py].
- `claims.get('role')` returns `None` for tokens without a `role` claim while `jwt_utils.current_role()` defaults to `'student'` — two code paths disagree on the default; `require_role` behavior (403 for missing claim) is conservative but inconsistent with `current_role()` [backend/app/middleware/rbac.py, backend/app/utils/jwt_utils.py].
- Refresh token accepted on access-protected routes if `JWT_TOKEN_LOCATION` config is ever extended to include cookies — currently safe (headers only); no explicit guard in `require_auth`/`require_role`.
- Stacking `@require_auth` + `@require_role` calls `verify_jwt_in_request()` twice, triggering two Redis blocklist lookups per request — docs say not to stack; not a correctness bug.
- No test for a blocklisted access token against `require_auth`/`require_role` — blocklist behavior is exercised by the Story 2.3 test suite; not duplicated here.
- No test for expired token returning correct envelope — non-trivial to fabricate; also tied to pre-existing expired_token_loader gap.
- `_primary_role()` in `jwt_service.py` non-deterministic for multi-role users (no `ORDER BY` on `lazy='dynamic'` relationship) — pre-existing from Story 2.2; single-role invariant holds currently.

## Deferred from: code review of 2-3-token-refresh-and-logout (2026-04-20)

- Non-atomic `rotate_tokens`: old JTI is blocklisted before new token issuance; if issuance fails, user is locked out for 7 days — pre-existing design in `jwt_service.py` (story 2-2 territory).
- Blocklist TTL uses full configured `JWT_REFRESH_TOKEN_EXPIRES` (604800s) regardless of remaining token lifetime — conservative but wastes Redis memory; fix requires extracting `exp` from decoded token.
- Redis connection not pooled in `_redis_client()` — creates new TCP connection per blocklist operation; pre-existing (story 2-2).
- Silent Redis failure causes logout to appear successful (200) while token remains valid — pre-existing (story 2-2); needs Redis health check or alerting.
- Expired refresh token path for AC2 not directly tested — requires fabricating an expired token via `create_refresh_token` with past expiry; deferred as acceptable coverage gap.
- Rate limiter key `get_remote_address` bypassable via spoofed `X-Forwarded-For` — pre-existing limiter config; address when deploying behind a known proxy with trusted headers.

## Deferred from: code review of 2-1-user-registration-api (2026-04-19)

- Email case-normalization missing — `User@Example.com` and `user@example.com` treated as distinct accounts; requires product decision on whether to lowercase on input.
- Whitespace-only names not rejected — `" "` passes `Length(min=1)` marshmallow validation; add `validate.Length(min=1)` with `str.strip()` pre-processing or a custom validator when name hygiene policy is defined.
- No explicit session rollback on DB error — relies on Flask-SQLAlchemy `db.session.remove()` teardown hook; if session is reused across requests in tests, dirty state may leak; add explicit rollback if isolation issues surface.

## Deferred from: code review of 1-5-next-js-frontend-base-configuration (2026-04-19)

- `clearAuth()` does not invalidate HttpOnly refresh cookie — redirect loop risk if cookie persists; backend must clear cookie on refresh failure (Stories 2.x auth).
- axios fallback `http://localhost:5000` — insecure if `NEXT_PUBLIC_API_URL` missing in non-local env; add build-time assertion (`if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV !== 'development') throw ...`).
- `PaginationMeta` lacks computed `totalPages` — every consumer must compute `Math.ceil(total/perPage)`, off-by-one-prone; enhance when pagination UI is built.
- `ApiError` lacks field-level validation map — cannot represent per-field errors from backend; refine type when form validation errors are needed.
- `ApiResponse<T>` allows `data: null` + `error: null` simultaneously — consider discriminated union for exhaustive narrowing in a future type hardening story.
- `staleTime: 60 s` global on QueryClient — auth-sensitive queries may serve stale revoked data; set `staleTime: 0` per-query where needed in future stories.
- `queryKeys.userProgress` accepts raw `userId` — TanStack Query cache not scoped to current user; address when progress queries are implemented (Story 5.x).
- No error boundary around `Providers` — rendering crash shows blank screen; add `<ErrorBoundary>` when global error UI is designed.
- No `returnTo` URL on `/login` redirect — deep links lost on session expiry; address in frontend auth story (Story 2.5/2.6).
- `apiClient` module-level singleton — theoretically shared across SSR requests in the same Node.js worker; mitigated once `'use client'` patch is applied to `client.ts`.

## Deferred from: code review of 1-4-database-schema-and-initial-migration (2026-04-19)

- Hardcoded fallback secrets SECRET_KEY/JWT_SECRET_KEY in base Config — pre-existing from Story 1.3; staging/prod must set env vars or startup fails.
- `app` fixture connects to real dev MySQL DB with no test isolation — pre-existing; affects client-based tests on CI without MySQL.
- StagingConfig/ProductionConfig RATELIMIT_STORAGE_URI is None when REDIS_URL unset — pre-existing from Story 1.3; startup validation guards against this.
- StagingConfig SQLALCHEMY_DATABASE_URI is None with no fallback error — pre-existing from Story 1.3; operator must set DATABASE_URL.
- `correct_answer` stored as plaintext VARCHAR(255) in exercises — per spec; security hardening (hashing or encryption) is a future story concern.
- AssessmentSubmission.has_passed not enforced against score/passing_score — application-layer grading logic will handle this in the assessment grading story.
- `onupdate` lambda not fired for bulk SQLAlchemy ORM updates — known SQLAlchemy behavior; future bulk-update code must set updated_at explicitly.
- Lesson.order default=1 with no unique-per-course constraint — ordering is managed by the application layer; add constraint if needed in content management story.
- seed-db concurrent race condition on title check-before-insert — unrealistic for a single-use dev tool; add DB-level unique constraint on course title if needed.
- ExerciseSubmission.score nullable=False with no default — per spec (auto-graded at submission time); ensure all creation paths always supply a score.
- lesson_progress lacks dedicated student_id index — UNIQUE(student_id, lesson_id) covers student_id prefix lookups on MySQL; add if query profiling shows need.

## Deferred from: code review of 1-3-flask-application-factory-and-core-middleware (2026-04-19)

- `logging.basicConfig` called inside `create_app()` is a no-op after the first call in a process — mandated by spec for CloudWatch clean JSON stdout; revisit if multi-app-instance test patterns cause log-level confusion.
- `format='%(message)s'` strips log level, logger name, and timestamp from all non-JSON third-party log output — intentional per spec; revisit when adding structured library logging.
- `json.dumps` failure in `after_request` is unguarded — theoretical risk since Flask request attributes (`method`, `path`, `status_code`) are always JSON-serializable strings/ints.
- AC3 CORS rejection has no integration test — CORS logic is unchanged from Story 1.2; proper origin-header test requires additional fixture setup, deferred to a dedicated auth/CORS testing story.
