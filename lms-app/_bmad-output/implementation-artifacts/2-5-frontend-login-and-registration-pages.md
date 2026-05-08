# Story 2.5: Frontend Login and Registration Pages

Status: done

## Story

As a new or returning user,
I want login and registration pages with form validation,
So that I can authenticate and be redirected to my role-appropriate dashboard.

## Acceptance Criteria

**AC1 — Login page displays email and password form**
Given the user visits `/login`
When the page loads
Then a form with email and password fields is displayed

**AC2 — Valid login stores token and redirects to role dashboard**
Given the user submits valid credentials
When the API returns a successful login response
Then the access token is stored in Zustand `authStore` via `setAuth(user, role, accessToken)`
And the user is redirected to `/student/dashboard`, `/teacher/dashboard`, or `/admin/dashboard` based on their role

**AC3 — Invalid login shows toast, stays on login page**
Given the user submits invalid credentials
When the API returns HTTP 401
Then a toast error "Invalid email or password" is displayed
And the user remains on the login page

**AC4 — Registration creates account, auto-logs-in, redirects to student dashboard**
Given the user visits `/register` and completes the form (email, password, first name, last name)
When they submit
Then the account is created, the access token is stored via `setAuth`, and they are redirected to `/student/dashboard`

**AC5 — Zod validation shows inline error before API call**
Given Zod schema validation on the login or register form
When the user submits with an invalid email format
Then inline error "Please enter a valid email address" appears before the API call is made
And no network request is sent

## Tasks / Subtasks

- [x] Task 1: Create `src/lib/api/auth.ts` — API functions (AC: 2, 3, 4)
  - [x] `login(email, password)` — POST /api/v1/auth/login, return `LoginResponse`
  - [x] `register(email, password, firstName, lastName)` — POST /api/v1/auth/register, return `RegisterResponse`

- [x] Task 2: Create `src/components/auth/LoginForm.tsx` (AC: 1, 2, 3, 5)
  - [x] React Hook Form + zodResolver with login Zod schema
  - [x] On success: call `useAuthStore.setAuth`, use `useRouter().push(dashboardPath)`
  - [x] On 401: call `toast.error('Invalid email or password')`
  - [x] Inline field errors from Zod via `formState.errors`

- [x] Task 3: Create `src/components/auth/RegisterForm.tsx` (AC: 4, 5)
  - [x] React Hook Form + zodResolver with register Zod schema
  - [x] On success: call `useAuthStore.setAuth`, redirect to `/student/dashboard`
  - [x] On API error: show toast with `error.detail`

- [x] Task 4: Wire pages (AC: 1, 4)
  - [x] Replace `src/app/(auth)/login/page.tsx` stub with `<LoginForm />`
  - [x] Replace `src/app/(auth)/register/page.tsx` stub with `<RegisterForm />`

- [x] Task 5: Tests (AC: 1–5)
  - [x] Unit tests: Zod schema validation for login and register schemas
  - [x] Integration tests: login/register happy path and error path using React Testing Library + MSW (or vitest-fetch-mock)

---

## Dev Notes

### CRITICAL: Read the AGENTS.md Warning First

`frontend/AGENTS.md` (loaded from `frontend/CLAUDE.md`) explicitly states:
> "This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices."

Before writing any Next.js-specific code (routing, server components, metadata, etc.), read the relevant guide in `node_modules/next/dist/docs/`.

### Package Versions — Breaking Changes to Know

| Package | Version | Critical Notes |
|---------|---------|----------------|
| `next` | 16.2.4 | May have API changes vs training data — read docs |
| `react` | 19.2.4 | React 19 has new hooks, concurrent changes |
| `zod` | ^4.3.6 | **v4 breaking change**: error message internals changed; `z.string().email()` still works but `.safeParse()` result shape may differ |
| `react-hook-form` | ^7.72.1 | `useForm`, `register`, `handleSubmit`, `formState.errors` — same API |
| `@hookform/resolvers` | ^5.2.2 | **v5**: import path is still `from '@hookform/resolvers/zod'`; verify resolver function signature |
| `zustand` | ^5.0.12 | v5: `create` no longer has the double-call pattern; `create<State>()((set) => ...)` deprecated — check existing `authStore.ts` pattern and match it |
| `sonner` | ^2.0.7 | `toast.error(msg)` API same; `<Toaster>` already in `Providers.tsx` |
| `@tanstack/react-query` | ^5.99.1 | v5: `useQuery` requires `queryKey` + `queryFn` in object form |

### Existing Infrastructure — Do NOT Recreate

#### Axios API Client (`src/lib/api/client.ts`)
- Exports `apiClient` (Axios instance)
- **Already wired**: `Authorization: Bearer <token>` injected from `useAuthStore.getState().accessToken`
- **Already handles 401**: auto-calls `POST /api/v1/auth/refresh` with cookie, retries, then `clearAuth()` + redirects to `/login` on failure
- **Use `apiClient` for all requests** — never import raw `axios` for API calls

#### Auth Store (`src/lib/stores/authStore.ts`)
```ts
// Existing interface — do NOT modify
interface AuthState {
  user: User | null
  role: UserRole | null
  accessToken: string | null
  setAuth: (user: User, role: UserRole, accessToken: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
}
export const useAuthStore = create<AuthState>()(...)
```
- `setAuth(user, role, accessToken)` — call this on successful login/register
- `clearAuth()` — the 401 interceptor in `client.ts` already calls this on refresh failure

#### Types (`src/types/user.ts`, `src/types/api.ts`)
```ts
// src/types/user.ts
export type UserRole = 'student' | 'teacher' | 'admin'
export interface User {
  id: number
  email: string
  firstName: string   // ← camelCase (NOT snake_case)
  lastName: string
  isActive: boolean
  createdAt: string
}

// src/types/api.ts
export interface ApiResponse<T> {
  data: T | null
  meta: PaginationMeta | null
  error: ApiError | null
}
export interface ApiError {
  type: string; title: string; detail: string; status: number
}
```

#### Toast
`sonner`'s `<Toaster>` is already mounted in `Providers.tsx`. Use:
```ts
import { toast } from 'sonner'
toast.error('Invalid email or password')
toast.success('Account created!')
```

#### shadcn/ui Components Available
`Button`, `Input`, `Card`, `CardHeader`, `CardContent`, `CardFooter`, `Badge`, `Skeleton` — all in `src/components/ui/`. Import from `@/components/ui/<name>`.

### API Contract (from `backend/app/api/v1/auth/routes.py`)

**POST /api/v1/auth/login**
- Request: `{ email, password }`
- Success 200: `{ data: { access_token: string, user: { id, email, role, ... } }, meta: null, error: null }`
- The `user` object from the login response has a `role` field (string: `'student' | 'teacher' | 'admin'`)
- Error 401: `{ data: null, meta: null, error: { type: 'UNAUTHORIZED', detail: 'Invalid credentials', status: 401 } }`
- The refresh token is set as an httpOnly cookie `refresh_token_cookie` — browser handles it automatically

**POST /api/v1/auth/register**
- Request: `{ email, password, first_name, last_name }` — **snake_case to backend**
- Success 201: `{ data: { id, email, role: 'student', access_token: string, ... }, meta: null, error: null }`
- Error 422 (email taken): `{ error: { type: 'VALIDATION_ERROR', detail: 'Email already registered', status: 422 } }`
- Error 422 (validation): `{ error: { type: 'VALIDATION_ERROR', detail: '...', status: 422 } }`

**Important**: The backend response `user` object uses **snake_case** (`first_name`, `last_name`, `is_active`, `created_at`). The frontend `User` type uses **camelCase** (`firstName`, `lastName`, `isActive`, `createdAt`). You MUST transform the response before calling `setAuth`.

### Role → Dashboard Routing

```ts
const ROLE_DASHBOARD: Record<UserRole, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  admin: '/admin/dashboard',
}
```

### File Structure to Create

```
frontend/src/
├── lib/
│   └── api/
│       └── auth.ts              # NEW — login(), register() API functions
├── components/
│   └── auth/
│       ├── LoginForm.tsx        # NEW — form component
│       └── RegisterForm.tsx     # NEW — form component
├── app/
│   └── (auth)/
│       ├── login/
│       │   └── page.tsx         # MODIFY — replace stub with <LoginForm />
│       └── register/
│           └── page.tsx         # MODIFY — replace stub with <RegisterForm />
└── __tests__/                   # NEW (or co-located) — test files
```

### Implementation Patterns

#### `src/lib/api/auth.ts` pattern
```ts
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { User, UserRole } from '@/types/user'

interface LoginResponseData {
  access_token: string
  user: { id: number; email: string; role: UserRole; first_name: string; last_name: string; is_active: boolean; created_at: string }
}

export async function login(email: string, password: string) {
  const res = await apiClient.post<ApiResponse<LoginResponseData>>('/api/v1/auth/login', { email, password })
  return res.data  // { data: { access_token, user }, ... }
}

interface RegisterResponseData {
  id: number; email: string; role: UserRole; access_token: string
  first_name: string; last_name: string; is_active: boolean; created_at: string
}

export async function register(email: string, password: string, firstName: string, lastName: string) {
  const res = await apiClient.post<ApiResponse<RegisterResponseData>>('/api/v1/auth/register', {
    email, password, first_name: firstName, last_name: lastName,
  })
  return res.data
}
```

#### Zod Schema (for reference)
```ts
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
})
```

#### React Hook Form Pattern
```ts
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const form = useForm<z.infer<typeof loginSchema>>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
})
// form.handleSubmit(onSubmit) — validates before calling onSubmit
// form.formState.errors.email?.message — inline error
// form.formState.isSubmitting — disable button during request
```

#### `setAuth` call — transform snake_case to camelCase
```ts
const { user: rawUser, access_token } = data.data!
const user: User = {
  id: rawUser.id,
  email: rawUser.email,
  firstName: rawUser.first_name,
  lastName: rawUser.last_name,
  isActive: rawUser.is_active,
  createdAt: rawUser.created_at,
}
useAuthStore.getState().setAuth(user, rawUser.role, access_token)
```

#### Navigation in Client Components
```ts
import { useRouter } from 'next/navigation'
const router = useRouter()
router.push('/student/dashboard')
```

#### Error Handling Pattern
```ts
import axios from 'axios'
import { toast } from 'sonner'
import type { ApiResponse } from '@/types/api'

// In catch block:
if (axios.isAxiosError(err) && err.response) {
  const body = err.response.data as ApiResponse<unknown>
  const detail = body.error?.detail ?? 'Something went wrong'
  toast.error(detail)
}
```

### Pages — Client vs Server Components

The `(auth)/login/page.tsx` and `(auth)/register/page.tsx` pages MUST be client components (or render a client component) because they use:
- React hooks (`useForm`, `useRouter`, `useAuthStore`)
- Event handlers

Add `'use client'` to the page file OR keep the page as a server component that just renders the client form component. The form components themselves need `'use client'`.

Recommended pattern: page is a minimal server component that renders the form client component:
```tsx
// app/(auth)/login/page.tsx — server component (no 'use client')
import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <LoginForm />
    </main>
  )
}
```

### Testing Requirements

Every change requires unit and integration tests that all pass before the story is complete.

**Test setup**: Check `frontend/` for existing test config (`jest.config.*`, `vitest.config.*`, `*.test.*`). Use whatever framework is configured. If none exists, use **Vitest** (matches the Vite/Next.js ecosystem).

**What to test**:

1. **Unit — Zod schema validation**:
   - Valid email passes
   - Invalid email format → error message `'Please enter a valid email address'`
   - Password too short on register → error
   - Missing required fields → errors

2. **Integration/Component — LoginForm**:
   - Renders email and password fields
   - Submitting with invalid email shows inline error, does NOT call API
   - Submitting valid credentials calls `login()` → `setAuth()` → redirects to correct dashboard
   - 401 response shows toast "Invalid email or password"
   - Submit button disabled while submitting

3. **Integration/Component — RegisterForm**:
   - Renders all four fields
   - Successful register calls `register()` → `setAuth()` → redirects to `/student/dashboard`
   - API error shows toast with `error.detail`

**Mocking strategy**: Mock `src/lib/api/auth.ts` (the `login` and `register` functions) and `useAuthStore`. Mock `next/navigation`'s `useRouter`.

### What NOT to implement in this story

- Route guards / auth middleware (Story 2.6)
- Logout button (use existing `/api/v1/auth/logout` but no frontend logout UI needed yet)
- Profile/settings pages
- Remember me / persistent login

### Previous Story Context

Story 2.4 (RBAC Middleware) established the backend `@require_auth` and `@require_role` decorators. The backend is fully tested and working. This story is purely frontend — no backend changes required.

### Cross-Story Awareness

Story 2.6 (Protected Route Guards) will read from `useAuthStore` to protect routes. Ensure `setAuth` is called correctly so Story 2.6 can rely on `useAuthStore().role` and `useAuthStore().user` being populated after login.

---

## Checklist

- [x] All ACs implemented and tested
- [x] `src/lib/api/auth.ts` created with `login()` and `register()`
- [x] `LoginForm.tsx` created with Zod validation + toast errors
- [x] `RegisterForm.tsx` created with Zod validation + toast errors
- [x] Login and register page stubs replaced
- [x] Snake_case → camelCase mapping applied when calling `setAuth`
- [x] Role → dashboard routing works for all three roles
- [x] All tests pass
- [x] No TypeScript errors (`tsc --noEmit`)

---

## Dev Agent Record

### Implementation Plan

1. Set up Vitest + React Testing Library (no test framework existed)
2. Task 1: Created `src/lib/api/auth.ts` with `login()` and `register()` wrapping `apiClient`
3. Task 2: Created `LoginForm.tsx` — React Hook Form + Zod + role-based redirect + 401 toast
4. Task 3: Created `RegisterForm.tsx` — same pattern, always redirects to `/student/dashboard`
5. Task 4: Replaced login and register page stubs with form components (server component pages)
6. Task 5: 24 tests across 4 test files — all pass, no TypeScript errors

### Completion Notes

- Vitest (v4.1.4) + React Testing Library (v16.3.2) installed as devDependencies; `vitest.config.mts` created
- `vi.mock` hoisting requires mock factories to not reference outer `const` variables — fixed by using `vi.mocked()` pattern
- `useRouter` mock cast needs `as unknown as ReturnType<typeof useRouter>` because `AppRouterInstance` has many methods
- Pages implemented as server components (no `'use client'`) rendering client form components — Next.js recommended pattern
- snake_case → camelCase transform applied in both form components before `setAuth` call
- `@base-ui/react` components (Button, Input) render native HTML elements, so `getByRole`/`getByLabelText` work correctly

### File List

- `frontend/vitest.config.mts` (NEW)
- `frontend/package.json` (MODIFIED — added test scripts, devDependencies)
- `frontend/src/__tests__/setup.ts` (NEW)
- `frontend/src/__tests__/lib/api/auth.test.ts` (NEW)
- `frontend/src/__tests__/lib/validation/authSchemas.test.ts` (NEW)
- `frontend/src/__tests__/components/auth/LoginForm.test.tsx` (NEW)
- `frontend/src/__tests__/components/auth/RegisterForm.test.tsx` (NEW)
- `frontend/src/lib/api/auth.ts` (NEW)
- `frontend/src/components/auth/LoginForm.tsx` (NEW)
- `frontend/src/components/auth/RegisterForm.tsx` (NEW)
- `frontend/src/app/(auth)/login/page.tsx` (MODIFIED)
- `frontend/src/app/(auth)/register/page.tsx` (MODIFIED)

### Change Log

- Implemented frontend auth pages (Story 2.5) — login/register forms with Zod validation, Zustand store integration, role-based redirects, and toast error handling. Set up Vitest test infrastructure. (Date: 2026-04-20)

---

## Senior Developer Review (AI)

**Review Date:** 2026-04-20
**Outcome:** Changes Requested
**Layers:** Blind Hunter + Edge Case Hunter + Acceptance Auditor

### Review Follow-ups (AI)

**Patches (must fix):**
- [x] [Review][Patch] Null-guard `response.data` before non-null assertion access — runtime crash on unexpected API shape [LoginForm.tsx:48, RegisterForm.tsx:44]
- [x] [Review][Patch] Add fallback route in ROLE_DASHBOARD for unknown roles — `router.push(undefined)` on unexpected backend role [LoginForm.tsx]
- [x] [Review][Patch] RegisterForm hardcodes `/student/dashboard` — use `ROLE_DASHBOARD[rawUser.role]` like LoginForm does [RegisterForm.tsx]
- [x] [Review][Patch] Login password schema uses `min(1)` — should be `min(8)` to match register and backend policy [LoginForm.tsx]
- [x] [Review][Patch] auth.test.ts uses `clearAllMocks` — should be `resetAllMocks` to prevent mock implementation leakage [auth.test.ts]
- [x] [Review][Patch] No test for network-level error path (no `err.response`) in LoginForm and RegisterForm [LoginForm.test.tsx, RegisterForm.test.tsx]

**Defers:**
- [x] [Review][Defer] Access token stored without validation or expiry check — deferred, out of scope [auth.ts]
- [x] [Review][Defer] Accessibility: no `aria-invalid`/`aria-describedby` on inputs with errors — deferred, accessibility pass is future work [LoginForm.tsx, RegisterForm.tsx]
- [x] [Review][Defer] Duplicate Zod schema definitions in test file vs component files — extract to shared module in future refactor [authSchemas.test.ts]
- [x] [Review][Defer] `auth.ts` missing `'use client'` directive — defensive boundary enforcement for future RSC safety [auth.ts]
- [x] [Review][Defer] Zustand auth store has no persistence/rehydration — pre-existing from Story 1.5; interceptor recovers on 401 [authStore.ts]
- [x] [Review][Defer] No `console.error` in catch blocks — debugging gap in development; no logging infra defined for frontend yet [LoginForm.tsx, RegisterForm.tsx]
- [x] [Review][Defer] `setAuth` called before `router.push` with no navigation failure rollback — theoretical; Next.js router.push is fire-and-forget [LoginForm.tsx, RegisterForm.tsx]
- [x] [Review][Defer] No client-side rate-limit backoff on repeated failed logins — backend enforces 20 req/min; no UX for 429 [LoginForm.tsx]
- [x] [Review][Defer] `vitest.config.mts` has no coverage thresholds — project-wide policy decision, not story-specific [vitest.config.mts]
- [x] [Review][Defer] `next/navigation` mock not configured globally in setup.ts — each test file mocks individually; acceptable for now [setup.ts]
- [x] [Review][Defer] `<h1>` inside CardHeader may conflict with page heading hierarchy — accessibility review needed [LoginForm.tsx, RegisterForm.tsx]
- [x] [Review][Defer] `processQueue` called with original 401 error instead of refresh error — pre-existing bug in client.ts from Story 1.5 [client.ts]
- [x] [Review][Defer] `isRefreshing` zombie state on partial refresh failure — pre-existing from client.ts Story 1.5 [client.ts]
- [x] [Review][Defer] `isActive: false` users redirected to dashboard without block — deferred to Story 2.6 route guards [forms]
