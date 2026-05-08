# Story 1.5: Next.js Frontend Base Configuration

## Story Metadata

| Field | Value |
|---|---|
| **Story ID** | 1.5 |
| **Story Key** | 1-5-next-js-frontend-base-configuration |
| **Epic** | Epic 1: Project Foundation & Development Environment |
| **Status** | ready-for-dev |
| **Date Created** | 2026-04-19 |

---

## User Story

**As a** developer,
**I want** the Next.js frontend configured with shadcn/ui, Axios API client, Zustand stores, and TanStack Query,
**So that** all frontend features can be built on a consistent, production-ready base.

---

## Acceptance Criteria

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

## Technical Context & Architecture Guardrails

### What Already Exists (Do NOT Recreate)

| File/Directory | Current State |
|---|---|
| `frontend/` | Next.js 16.2.4, React 19.2.4, TypeScript strict, Tailwind v4 |
| `frontend/next.config.ts` | `reactCompiler: true`, `output: 'standalone'` — DO NOT change |
| `frontend/src/app/layout.tsx` | Root layout — UPDATE to add providers |
| `frontend/src/app/globals.css` | Tailwind v4 CSS-first (`@import "tailwindcss"`) — DO NOT add `@tailwind` directives |
| `frontend/src/app/(auth)/` | Route group stub — leave empty, Story 2.5 implements |
| `frontend/src/app/(student)/` | Route group stub — leave empty |
| `frontend/src/app/(teacher)/` | Route group stub — leave empty |
| `frontend/src/app/(admin)/` | Route group stub — leave empty |
| `frontend/src/middleware.ts` | Passthrough stub — DO NOT modify (Story 2.6 implements) |
| `frontend/src/components/ui/` | Empty — Story 1.5 populates |
| `frontend/src/lib/api/` | Empty — Story 1.5 populates |
| `frontend/src/lib/stores/` | Empty — Story 1.5 populates |
| `frontend/src/lib/utils/` | Empty — Story 1.5 adds `cn.ts` |
| `frontend/src/types/` | Empty — Story 1.5 adds `api.ts`, `user.ts` |

### Critical Technical Constraints (NON-NEGOTIABLE)

#### Tailwind CSS v4 (NOT v3)

This project uses **Tailwind CSS v4**. The v4 CSS-first approach means:
- `globals.css` uses `@import "tailwindcss"` — already present, DO NOT change to `@tailwind base/components/utilities`
- There is NO `tailwind.config.ts` file — v4 scans source files automatically
- shadcn/ui must be initialized in v4 mode — the CLI (`npx shadcn@latest`) detects Tailwind v4 automatically and writes CSS variables into `globals.css` instead of a JS config file
- DO NOT create `tailwind.config.ts` — it would conflict with v4

#### Next.js 16 + React 19

- **React Compiler is enabled** (`reactCompiler: true`) — do not add `useMemo`/`useCallback` manually; the compiler handles this
- **React 19 Server Components by default** — layout.tsx is a Server Component; `QueryClientProvider` and any hook-based providers MUST be in a separate `'use client'` component
- The correct pattern: create `src/components/common/Providers.tsx` as `'use client'`, import it into `layout.tsx`

#### State Management Boundaries (Architecture-Mandated)

```
Zustand (useAuthStore)  → CLIENT state ONLY: user, role, accessToken, UI state
TanStack Query          → ALL server state: courses, lessons, progress, users
localStorage/cookie     → NEVER store accessToken here (memory only per architecture)
httpOnly cookie         → refresh_token (set by backend, not accessible to JS)
```

#### File Naming (TypeScript — Airbnb style per architecture)

```
PascalCase.tsx   → React components (CourseCard.tsx, Providers.tsx)
camelCase.ts     → Non-component files (client.ts, authStore.ts, queryKeys.ts)
```

#### API Base URL

Use environment variable `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000`). This env var must be set in `.env.local` for local dev.

---

## Implementation Tasks

### Task 1: Install Dependencies ✅

Run in `frontend/` directory:

```bash
npm install axios zustand @tanstack/react-query react-hook-form @hookform/resolvers zod date-fns
```

Expected final `dependencies` additions in `package.json`:
- `axios` — HTTP client with interceptors
- `zustand` — client-side state (auth, UI)
- `@tanstack/react-query` — server state management
- `react-hook-form` — form state (used from Story 2.5 onwards)
- `@hookform/resolvers` — Zod resolver for react-hook-form
- `zod` — runtime schema validation (mirrors backend marshmallow)
- `date-fns` — date formatting (architecture mandates this, NOT moment.js)

Do NOT install: `@tanstack/react-query-devtools` (dev-only, add if desired), `next-themes` (not in scope).

### Task 2: Initialize shadcn/ui ✅

Run in `frontend/` directory:

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

This will:
1. Create `frontend/components.json` (shadcn configuration)
2. Add CSS variable definitions to `src/app/globals.css`
3. Create or update `src/lib/utils/cn.ts` (the `cn` utility using `clsx` + `tailwind-merge`)
4. Install `clsx` and `tailwind-merge` as dependencies

After init, add the 6 required base components:

```bash
npx shadcn@latest add button input card badge skeleton sonner
```

Note: Use `sonner` instead of `toast` — shadcn/ui's current toast implementation uses Sonner. All components land in `src/components/ui/`.

**Expected files created in `src/components/ui/`:**
- `button.tsx`
- `input.tsx`
- `card.tsx`
- `badge.tsx`
- `skeleton.tsx`
- `sonner.tsx` (toast notifications via Sonner library)

### Task 3: Create TypeScript Types — `src/types/api.ts` ✅

```typescript
export interface ApiResponse<T> {
  data: T | null
  meta: PaginationMeta | null
  error: ApiError | null
}

export interface PaginationMeta {
  page: number
  perPage: number
  total: number
}

export interface ApiError {
  type: string
  title: string
  detail: string
  status: number
}
```

### Task 4: Create TypeScript Types — `src/types/user.ts` ✅

```typescript
export type UserRole = 'student' | 'teacher' | 'admin'

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  createdAt: string
}
```

Note: Backend returns `snake_case` (`first_name`, `last_name`). For this story, types use `camelCase` — the Axios interceptor in Task 5 handles the conversion. If conversion is deferred to a later story, use `snake_case` in types and update when the interceptor is added.

### Task 5: Create Axios API Client — `src/lib/api/client.ts` ✅

```typescript
import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // required: sends httpOnly refresh_token cookie automatically
  headers: { 'Content-Type': 'application/json' },
})

// Inject access token from authStore on every request
apiClient.interceptors.request.use((config) => {
  // Lazy import avoids circular dependency (authStore imports apiClient)
  const { useAuthStore } = require('@/lib/stores/authStore')
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401: auto-refresh, retry, redirect on failure
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        )
        const newToken = refreshResponse.data?.data?.access_token
        if (newToken) {
          const { useAuthStore } = require('@/lib/stores/authStore')
          useAuthStore.getState().setAccessToken(newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return apiClient(originalRequest)
        }
      } catch {
        const { useAuthStore } = require('@/lib/stores/authStore')
        useAuthStore.getState().clearAuth()
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)
```

**Critical notes on this implementation:**
- Uses `require('@/lib/stores/authStore')` inside interceptors to avoid circular imports — `authStore.ts` will import `apiClient`, so a top-level import of `authStore` in `client.ts` creates a cycle
- `withCredentials: true` is essential — the refresh token is in an httpOnly cookie that the browser sends automatically
- Refresh is called via plain `axios` (not `apiClient`) to avoid recursive 401 loops
- The `_retry` flag prevents infinite retry loops on repeated 401s

### Task 6: Create Zustand Auth Store — `src/lib/stores/authStore.ts` ✅

```typescript
import { create } from 'zustand'
import type { User, UserRole } from '@/types/user'

interface AuthState {
  user: User | null
  role: UserRole | null
  accessToken: string | null
  setAuth: (user: User, role: UserRole, accessToken: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  role: null,
  accessToken: null,
  setAuth: (user, role, accessToken) => set({ user, role, accessToken }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, role: null, accessToken: null }),
}))
```

**Critical notes:**
- **Memory-only** — no `persist` middleware; accessToken is wiped on page refresh (by design per architecture)
- The refresh token in the httpOnly cookie handles re-authentication after refresh
- `useAuthStore.getState()` (non-hook access) is used in the Axios interceptor for non-component contexts
- Zustand 5.x uses `create<State>()((set) => ...)` — the double-parentheses form enables TypeScript inference

### Task 7: Create Centralized Query Keys — `src/lib/utils/queryKeys.ts` ✅

```typescript
export const queryKeys = {
  courses: () => ['courses'] as const,
  course: (id: number) => ['courses', id] as const,
  courseLessons: (courseId: number) => ['courses', courseId, 'lessons'] as const,
  userProgress: (userId: number) => ['users', userId, 'progress'] as const,
  myProgress: () => ['progress', 'me'] as const,
} as const
```

### Task 8: Create Client-Side Providers Component — `src/components/common/Providers.tsx` ✅

**This is required because `QueryClientProvider` and any React hook-dependent code cannot run in Server Components (layout.tsx is a Server Component).**

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures each browser session gets its own QueryClient
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
```

### Task 9: Update Root Layout — `src/app/layout.tsx` ✅

Update to:
1. Add `<Providers>` wrapper around children
2. Update title/description metadata for lms-app

```typescript
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/common/Providers'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'LMS App',
  description: 'Language learning management system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Task 10: Create `.env.local` for Local Development ✅

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

This file is git-ignored. Add to `frontend/.env.example`:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Task 11: Verify TypeScript Compilation and Tests ✅

Run in `frontend/`:

```bash
npx tsc --noEmit
npm run lint
```

Both must pass with zero errors. Fix any type errors before marking complete.

Write a basic smoke test to verify imports resolve (co-located test pattern, Jest/Vitest not yet configured — use TypeScript compilation as the test).

**Verify by inspection:**
- `src/components/ui/button.tsx` exists
- `src/components/ui/input.tsx` exists
- `src/components/ui/card.tsx` exists
- `src/components/ui/badge.tsx` exists
- `src/components/ui/skeleton.tsx` exists
- `src/components/ui/sonner.tsx` exists
- `src/lib/api/client.ts` exists with Axios instance exported as `apiClient`
- `src/lib/stores/authStore.ts` exports `useAuthStore` with `user`, `role`, `accessToken`, `setAuth`, `setAccessToken`, `clearAuth`
- `src/components/common/Providers.tsx` marked `'use client'`, wraps QueryClientProvider + Toaster
- `src/app/layout.tsx` imports and renders `<Providers>`
- `src/types/api.ts` exports `ApiResponse`, `PaginationMeta`, `ApiError`
- `src/types/user.ts` exports `User`, `UserRole`
- `src/lib/utils/queryKeys.ts` exports `queryKeys`
- `frontend/.env.local` exists with `NEXT_PUBLIC_API_URL`
- `frontend/.env.example` exists

---

## Architecture Compliance

### Anti-Patterns — DO NOT Do These

```typescript
// ❌ Store accessToken in localStorage (XSS vulnerability)
localStorage.setItem('access_token', token)

// ✅ Store in Zustand memory only
useAuthStore.getState().setAuth(user, role, token)
```

```typescript
// ❌ Server data in Zustand
const useCourseStore = create(() => ({ courses: [] }))

// ✅ Server data via TanStack Query
const { data: courses } = useQuery({ queryKey: queryKeys.courses(), queryFn: fetchCourses })
```

```typescript
// ❌ Create QueryClient outside component (shared across requests in SSR → data leaks)
const queryClient = new QueryClient()

// ✅ Create per-request inside useState (architecture mandated for Next.js SSR)
const [queryClient] = useState(() => new QueryClient())
```

```typescript
// ❌ Add tailwind.config.ts — breaks Tailwind v4
// ❌ Change @import "tailwindcss" to @tailwind directives — breaks Tailwind v4
// ✅ Leave globals.css Tailwind v4 CSS-first setup untouched
```

```typescript
// ❌ Import authStore at module-level inside client.ts (circular import)
import { useAuthStore } from '@/lib/stores/authStore'

// ✅ Lazy require inside interceptor functions to break circular dependency
const { useAuthStore } = require('@/lib/stores/authStore')
```

```typescript
// ❌ Add 'use client' to layout.tsx (disables Server Component benefits)
// ✅ Keep layout.tsx as Server Component; wrap client code in Providers.tsx
```

---

## Previous Story Intelligence

From Stories 1.1–1.4 (backend context, patterns to follow in frontend):

- **Response envelope format:** Every API response is `{"data": ..., "meta": ..., "error": ...}` — `ApiResponse<T>` type in `src/types/api.ts` must match exactly
- **Snake_case ↔ camelCase:** Backend sends `snake_case` JSON (`first_name`, `created_at`). Types can use `camelCase` but be consistent — if Axios response interceptor for conversion is deferred to Story 2.x, use `snake_case` in types and map in components
- **HTTP status codes:** 401 = unauthenticated (trigger refresh), 403 = forbidden (don't refresh, redirect), 422 = validation error, 429 = rate limit
- **Auth endpoints (upcoming Story 2.x):** `POST /api/v1/auth/refresh` uses httpOnly cookie (no body needed), returns `{"data": {"access_token": "..."}}`

---

## Dev Notes

- **Tailwind v4 + shadcn/ui:** `npx shadcn@latest init -d` auto-detected Tailwind v4 and wrote CSS variables directly into `globals.css` — no `tailwind.config.ts` created or needed.
- **Circular import:** Axios interceptors use lazy `require('@/lib/stores/authStore')` at call-time rather than a top-level import to avoid the `client.ts ↔ authStore.ts` cycle.
- **Route group conflict fix:** Pre-existing redirect stubs in `(student)/dashboard`, `(student)/courses`, `(teacher)/dashboard`, `(teacher)/courses`, `(admin)/dashboard`, `(admin)/users` all resolved to the same URL paths and caused Turbopack build failures. Removed those stubs — real placeholder pages live at the prefixed routes (`/student/dashboard`, `/teacher/dashboard`, etc.).
- **Lint warning:** 1 pre-existing warning in `src/middleware.ts` (unused `request` param) — this is a Story 2.6 stub, not introduced by Story 1.5.
- **Build:** `npm run build` passes with 0 errors, 12 static pages generated.

---

## Dev Agent Record

| Date | Agent | Action |
|---|---|---|
| 2026-04-19 | claude-sonnet-4-6 | Implemented all 11 tasks; fixed route group conflicts; build passes |

---

## File List

_All new and modified files (relative to repo root):_

- `frontend/package.json` — added axios, zustand, @tanstack/react-query, react-hook-form, @hookform/resolvers, zod, date-fns, clsx, tailwind-merge
- `frontend/components.json` — shadcn/ui configuration
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:5000`
- `frontend/.env.example` — env var template
- `frontend/src/app/globals.css` — shadcn/ui CSS variable definitions appended
- `frontend/src/app/layout.tsx` — updated: Providers wrapper, updated metadata
- `frontend/src/types/api.ts` — new: ApiResponse, PaginationMeta, ApiError
- `frontend/src/types/user.ts` — new: User, UserRole
- `frontend/src/lib/api/client.ts` — new: Axios instance with request/response interceptors
- `frontend/src/lib/stores/authStore.ts` — new: Zustand auth store
- `frontend/src/lib/utils/queryKeys.ts` — new: centralized TanStack Query keys
- `frontend/src/lib/utils.ts` — new: cn utility (created by shadcn init)
- `frontend/src/components/common/Providers.tsx` — new: 'use client' wrapper for QueryClientProvider + Toaster
- `frontend/src/components/ui/button.tsx` — new: shadcn/ui Button
- `frontend/src/components/ui/input.tsx` — new: shadcn/ui Input
- `frontend/src/components/ui/card.tsx` — new: shadcn/ui Card
- `frontend/src/components/ui/badge.tsx` — new: shadcn/ui Badge
- `frontend/src/components/ui/skeleton.tsx` — new: shadcn/ui Skeleton
- `frontend/src/components/ui/sonner.tsx` — new: shadcn/ui Toaster (Sonner)
- `frontend/src/app/(student)/dashboard/` — removed (route conflict)
- `frontend/src/app/(student)/courses/` — removed (route conflict)
- `frontend/src/app/(teacher)/dashboard/` — removed (route conflict)
- `frontend/src/app/(teacher)/courses/` — removed (route conflict)
- `frontend/src/app/(admin)/dashboard/` — removed (route conflict)
- `frontend/src/app/(admin)/users/` — removed (route conflict)

---

## Review Findings

### Patches
- [x] [Review][Patch] Concurrent 401 race condition — multiple in-flight requests each fire a separate refresh call; implement `isRefreshing` flag + promise queue [`client.ts` response interceptor]
- [x] [Review][Patch] Silent null after successful refresh — no `else` branch when refresh returns 200 but `newToken` is falsy; add `else` → `clearAuth()` + redirect [`client.ts` lines 32–46]
- [x] [Review][Patch] `originalRequest.headers` may be undefined — `.Authorization` assignment throws if headers null; add null guard [`client.ts` line 38]
- [x] [Review][Patch] `shadcn` in production `dependencies` — spec constraint: CLI tool must be in `devDependencies` [`package.json`]
- [x] [Review][Patch] `ThemeProvider` missing — `useTheme()` in `sonner.tsx` always returns "system"; add `ThemeProvider` from `next-themes` to `Providers.tsx` [`Providers.tsx`]
- [x] [Review][Patch] `require()` in interceptors — risks SSR evaluation and bypasses module system; add `'use client'` directive to `client.ts` [`client.ts` lines 13, 36, 42]

### Deferred
- [x] [Review][Defer] `clearAuth()` does not invalidate HttpOnly refresh cookie — redirect loop risk if cookie persists — deferred, backend auth story concern (Stories 2.x)
- [x] [Review][Defer] axios fallback `http://localhost:5000` — insecure if `NEXT_PUBLIC_API_URL` missing in non-local env — deferred, add build-time assertion in future
- [x] [Review][Defer] `PaginationMeta` lacks computed `totalPages` — forces off-by-one-prone computation in every consumer — deferred, enhance when pagination UI is built
- [x] [Review][Defer] `ApiError` lacks field-level validation map — cannot represent per-field errors from backend — deferred, refine when form validation errors are needed
- [x] [Review][Defer] `ApiResponse<T>` allows `data: null` + `error: null` simultaneously — discriminated union improvement — deferred, future type hardening
- [x] [Review][Defer] `staleTime: 60 s` global — auth-sensitive queries may serve stale data — deferred, set `staleTime: 0` per-query where needed in future stories
- [x] [Review][Defer] `queryKeys.userProgress` accepts raw `userId` — cache key not scoped to current user — deferred, address when progress queries are implemented
- [x] [Review][Defer] No error boundary around `Providers` — rendering crash shows blank screen — deferred, add `ErrorBoundary` when global error UI is designed
- [x] [Review][Defer] No `returnTo` URL on `/login` redirect — deep links lost on session expiry — deferred, address in auth story (Story 2.5/2.6)
- [x] [Review][Defer] `apiClient` module-level singleton — shared across SSR requests in same process — deferred, mitigated once `'use client'` patch is applied

---

## Change Log

| Date | Change |
|---|---|
| 2026-04-19 | Initial implementation — all tasks complete |
| 2026-04-19 | Code review complete — 6 patches, 10 deferred, 9 dismissed |

---

## Status

- **Status:** done
- **Created:** 2026-04-19
- **Completed:** 2026-04-19
