import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('@/lib/api/auth', () => ({ refreshToken: vi.fn() }))
vi.mock('@/lib/stores/authStore', () => ({ useAuthStore: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ replace: vi.fn() })) }))

import { RoleGuard } from '@/components/auth/RoleGuard'
import { refreshToken } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/authStore'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@/types/user'

const mockRefreshToken = vi.mocked(refreshToken)
const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseRouter = vi.mocked(useRouter)

function makeJwt(role: string): string {
  return `header.${btoa(JSON.stringify({ sub: '1', role }))}.sig`
}

type MockState = {
  user: null
  role: UserRole | null
  accessToken: string | null
  setAuth: ReturnType<typeof vi.fn>
  setAccessToken: ReturnType<typeof vi.fn>
  clearAuth: ReturnType<typeof vi.fn>
}

describe('RoleGuard', () => {
  let mockReplace: ReturnType<typeof vi.fn>
  let mockSetAccessToken: ReturnType<typeof vi.fn>
  let mockClearAuth: ReturnType<typeof vi.fn>
  let state: MockState

  function applyState(s: MockState) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseAuthStore.mockImplementation((selector?: (st: any) => unknown) =>
      selector ? selector(s) : s,
    )
    ;(useAuthStore as unknown as { getState: () => MockState }).getState = () => s
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockReplace = vi.fn()
    mockSetAccessToken = vi.fn()
    mockClearAuth = vi.fn()
    state = { user: null, role: null, accessToken: null, setAuth: vi.fn(), setAccessToken: mockSetAccessToken, clearAuth: mockClearAuth }
    applyState(state)
    mockUseRouter.mockReturnValue({ replace: mockReplace } as unknown as ReturnType<typeof useRouter>)
  })

  it('renders children when role matches requiredRoles', async () => {
    state = { ...state, role: 'student', accessToken: 'tok' }
    applyState(state)

    render(
      <RoleGuard requiredRoles={['student', 'admin']}>
        <div>student content</div>
      </RoleGuard>,
    )
    await waitFor(() => expect(screen.getByText('student content')).toBeDefined())
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('redirects student to /student/dashboard when visiting teacher route', async () => {
    state = { ...state, role: 'student', accessToken: 'tok' }
    applyState(state)

    render(
      <RoleGuard requiredRoles={['teacher', 'admin']}>
        <div>teacher content</div>
      </RoleGuard>,
    )
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/student/dashboard'))
    expect(screen.queryByText('teacher content')).toBeNull()
  })

  it('redirects teacher to /teacher/dashboard when visiting admin route', async () => {
    state = { ...state, role: 'teacher', accessToken: 'tok' }
    applyState(state)

    render(
      <RoleGuard requiredRoles={['admin']}>
        <div>admin content</div>
      </RoleGuard>,
    )
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/teacher/dashboard'))
    expect(screen.queryByText('admin content')).toBeNull()
  })

  it('allows admin to access student routes', async () => {
    state = { ...state, role: 'admin', accessToken: 'tok' }
    applyState(state)

    render(
      <RoleGuard requiredRoles={['student', 'admin']}>
        <div>admin on student route</div>
      </RoleGuard>,
    )
    await waitFor(() => expect(screen.getByText('admin on student route')).toBeDefined())
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('hydrates from refresh token when store is empty, then renders children', async () => {
    const token = makeJwt('student')
    mockRefreshToken.mockResolvedValueOnce({ data: { access_token: token }, meta: null, error: null })
    mockSetAccessToken.mockImplementation(() => {
      state = { ...state, role: 'student', accessToken: token }
      applyState(state)
    })

    render(
      <RoleGuard requiredRoles={['student']}>
        <div>hydrated content</div>
      </RoleGuard>,
    )
    await waitFor(() => expect(screen.getByText('hydrated content')).toBeDefined())
    expect(mockSetAccessToken).toHaveBeenCalledWith(token)
  })

  it('redirects to /login when refreshToken fails', async () => {
    mockRefreshToken.mockRejectedValueOnce(new Error('Network Error'))

    render(
      <RoleGuard requiredRoles={['student']}>
        <div>protected content</div>
      </RoleGuard>,
    )
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'))
    expect(screen.queryByText('protected content')).toBeNull()
  })
})
