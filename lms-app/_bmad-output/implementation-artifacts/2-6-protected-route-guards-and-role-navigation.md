# Story 2.6: Protected Route Guards and Role Navigation

## Story Metadata

| Field | Value |
|---|---|
| **Story ID** | 2.6 |
| **Story Key** | 2-6-protected-route-guards-and-role-navigation |
| **Epic** | Epic 2: User Authentication & Authorization |
| **Status** | in-progress |
| **Date Created** | 2026-04-20 |

---

## User Story

**As an** authenticated user,
**I want** the application to enforce role-based routing,
**So that** students cannot access teacher routes and vice versa.

---

## Acceptance Criteria

**AC1 — Unauthenticated access redirected to login**
Given an unauthenticated user visits `/student/dashboard`
When Next.js proxy runs
Then the user is redirected to `/login`

**AC2 — Student redirected away from teacher routes**
Given a logged-in student visits `/teacher/dashboard`
When the role guard checks the user's role
Then the user is redirected to `/student/dashboard`

**AC3 — Teacher redirected away from admin routes**
Given a logged-in teacher visits `/admin/dashboard`
When the role guard runs
Then the user is redirected to `/teacher/dashboard`

**AC4 — Admin has access everywhere**
Given a logged-in admin visits any route
When the role guard runs
Then access is granted to all areas

**AC5 — Proxy configured on all protected routes**
Given `src/proxy.ts` is configured
When any request hits a protected route
Then auth is checked before rendering

---

## Technical Context & Architecture Guardrails

### Constraint: Refresh cookie is path-restricted

`JWT_REFRESH_COOKIE_PATH = '/api/v1/auth'` means the browser only sends the
`refresh_token_cookie` to `/api/v1/auth/*` endpoints — NOT to Next.js proxy route
requests at `/student/dashboard`, etc. The proxy cannot read the refresh cookie.

**Solution**: A lightweight `lms-auth=1` indicator cookie (Path=/, non-HttpOnly)
is set by the frontend when login succeeds. The proxy checks this cookie for the
auth gate. Actual session validity is enforced by the `RoleGuard` (calls
`/api/v1/auth/refresh` on store-empty page loads, redirects to `/login` if refresh fails).

### Next.js 16 — `proxy.ts` not `middleware.ts`

`middleware.ts` is deprecated in Next.js 16. The file is `src/proxy.ts` with
a named export `proxy` (not default export `middleware`).

### Why indicator cookie, not refresh cookie

The refresh token cookie cannot be used by the proxy because it has
`Path=/api/v1/auth` — the browser will not send it to requests at `/student/*`.
The `lms-auth` cookie is a non-sensitive presence indicator (value=1) that the
browser sends on all requests (Path=/). Security is enforced server-side by the
backend JWT verification on every API call.

### Token hydration after page refresh

On page refresh, the Zustand store is empty (no role, no accessToken). The proxy
allows access if `lms-auth` cookie is present. The `RoleGuard` component then calls
`/api/v1/auth/refresh` to restore the access token. `setAccessToken` decodes the JWT
to extract and restore the `role` claim. If refresh fails, `clearAuth` removes the
`lms-auth` cookie and the user is redirected to `/login`.

### What already exists (do NOT recreate)

| File | State |
|---|---|
| `src/lib/stores/authStore.ts` | `setAuth`, `setAccessToken`, `clearAuth` — EXTEND |
| `src/lib/api/auth.ts` | `login()`, `register()` — ADD `refreshToken()` |
| `src/lib/api/client.ts` | Interceptor with refresh logic — DO NOT TOUCH |
| `src/app/(student)/layout.tsx` | Stub — REPLACE |
| `src/app/(teacher)/layout.tsx` | Stub — REPLACE |
| `src/app/(admin)/layout.tsx` | Stub — REPLACE |

---

## Implementation Tasks

### Task 1: Add `lms-auth` cookie management to `authStore.ts`

- `setAuth`: set `lms-auth=1; path=/; max-age=604800; samesite=lax` via `document.cookie`
- `clearAuth`: expire `lms-auth` via `document.cookie`
- `setAccessToken`: decode JWT payload to extract `role` claim; update store with both `accessToken` and decoded `role`

### Task 2: Create `src/lib/token.ts`

`decodeJwtRole(token: string): UserRole | null` — splits JWT, base64-decodes payload, validates role against known set. No packages — uses native `atob`.

### Task 3: Add `refreshToken()` to `src/lib/api/auth.ts`

`POST /api/v1/auth/refresh` via `apiClient` — returns `{ data: { access_token } }`.

### Task 4: Create `src/components/auth/RoleGuard.tsx`

Client component. On mount:
1. If `role` already in store → skip hydration
2. Else call `refreshToken()` → `setAccessToken(token)` → role decoded automatically
3. After hydration: if no role → redirect `/login`; if role not in `requiredRoles` → redirect to `ROLE_DASHBOARD[role]`
4. While checking: render `null` (no flash)

### Task 5: Create `src/proxy.ts`

- Protected paths: `/student`, `/teacher`, `/admin`
- Auth pages: `/login`, `/register`
- Check `request.cookies.has('lms-auth')`
- Unauth on protected → redirect `/login`
- Auth on auth pages → redirect `/student/dashboard` (RoleGuard will correct if needed)
- Matcher: `/((?!api|_next/static|_next/image|.*\\.png$).*)`

### Task 6: Update route group layouts

Wrap each with `<RoleGuard requiredRoles={...}>`:
- `(student)/layout.tsx` → `['student', 'admin']`
- `(teacher)/layout.tsx` → `['teacher', 'admin']`
- `(admin)/layout.tsx` → `['admin']`

### Task 7: Tests

**Unit — `src/__tests__/lib/token.test.ts`**:
- Valid JWT with student role → `'student'`
- Valid JWT with teacher role → `'teacher'`
- JWT with unknown role → `null`
- Malformed token → `null`
- Empty string → `null`

**Component — `src/__tests__/components/auth/RoleGuard.test.tsx`**:
- Student with `requiredRoles=['student']` → renders children
- Student with `requiredRoles=['teacher']` → redirects to `/student/dashboard`
- Teacher with `requiredRoles=['admin']` → redirects to `/teacher/dashboard`
- Admin with `requiredRoles=['student']` → renders children (admin has all access)
- Empty store → calls refreshToken → sets role → renders children
- Empty store + refreshToken failure → redirects to `/login`

**Unit — `src/__tests__/proxy.test.ts`**:
- Protected path + no cookie → NextResponse.redirect to `/login`
- Protected path + cookie → NextResponse.next()
- Auth path + cookie → NextResponse.redirect to `/student/dashboard`
- Auth path + no cookie → NextResponse.next()

---

## Implementation Tasks (Status)

- [x] Task 1: Extend `authStore.ts` with cookie management + role decode in `setAccessToken`
- [x] Task 2: Create `src/lib/token.ts`
- [x] Task 3: Add `refreshToken()` to `src/lib/api/auth.ts`
- [x] Task 4: Create `src/components/auth/RoleGuard.tsx`
- [x] Task 5: Create `src/proxy.ts`
- [x] Task 6: Update route group layouts
- [x] Task 7: Write tests — 52/52 pass

## Status

- **Status:** review
- **Created:** 2026-04-20
- **Completed:** 2026-04-20

## Dev Agent Record

| Date | Agent | Action |
|---|---|---|
| 2026-04-20 | claude-sonnet-4-6 | Implemented all 7 tasks; 52/52 tests pass |

### Completion Notes

- Next.js 16 uses `proxy.ts` (not `middleware.ts`) — renamed `middleware` export to `proxy`
- `JWT_REFRESH_COOKIE_PATH=/api/v1/auth` means the refresh cookie cannot be checked in proxy — solved with a lightweight `lms-auth` indicator cookie (Path=/) set by the frontend on login/register
- `setAccessToken` now decodes the JWT payload with native `atob` to extract and restore the `role` after page refresh/token rotation — no extra package needed
- On page load with empty store: `RoleGuard` calls `/api/v1/auth/refresh` directly (not relying on interceptor) to hydrate role before rendering
- `authStore.ts` is backward-compatible: existing `setAuth` and `clearAuth` interfaces unchanged; `setAccessToken` now also updates `role` from JWT

### File List

- `frontend/src/proxy.ts` (NEW)
- `frontend/src/lib/token.ts` (NEW)
- `frontend/src/components/auth/RoleGuard.tsx` (NEW)
- `frontend/src/lib/stores/authStore.ts` (MODIFIED)
- `frontend/src/lib/api/auth.ts` (MODIFIED — added `refreshToken`)
- `frontend/src/app/(student)/layout.tsx` (MODIFIED)
- `frontend/src/app/(teacher)/layout.tsx` (MODIFIED)
- `frontend/src/app/(admin)/layout.tsx` (MODIFIED)
- `frontend/src/__tests__/lib/token.test.ts` (NEW)
- `frontend/src/__tests__/proxy.test.ts` (NEW)
- `frontend/src/__tests__/components/auth/RoleGuard.test.tsx` (NEW)
