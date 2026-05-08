import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// All vi.mock calls must come before any variable declarations they reference.
// Use vi.fn() inline — access via vi.mocked() after import.
vi.mock('@/lib/api/auth', () => ({ login: vi.fn() }))
vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({ setAuth: vi.fn() })),
}))
vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn() })) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { LoginForm } from '@/components/auth/LoginForm'
import { login } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/authStore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const mockLogin = vi.mocked(login)
const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseRouter = vi.mocked(useRouter)

describe('LoginForm', () => {
  let mockSetAuth: ReturnType<typeof vi.fn>
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSetAuth = vi.fn()
    mockPush = vi.fn()
    mockUseAuthStore.mockReturnValue({ setAuth: mockSetAuth } as ReturnType<typeof useAuthStore>)
    mockUseRouter.mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
  })

  it('renders email and password fields', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(screen.getByLabelText(/password/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined()
  })

  it('shows inline error for short password without calling API', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeDefined()
    })
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('shows inline error for invalid email without calling API', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText(/email/i), 'notanemail')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeDefined()
    })
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls setAuth and redirects to student dashboard on successful login', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValueOnce({
      success: true, code: 'OK', message: 'Success', request_id: null,
      data: {
        access_token: 'tok',
        user: { id: 1, email: 'a@b.com', role: 'student', first_name: 'A', last_name: 'B', is_active: true, created_at: '2024-01-01' },
      },
      meta: null,
    })

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSetAuth).toHaveBeenCalledWith(
        { id: 1, email: 'a@b.com', firstName: 'A', lastName: 'B', isActive: true, createdAt: '2024-01-01' },
        'student',
        'tok',
      )
      expect(mockPush).toHaveBeenCalledWith('/student/dashboard')
    })
  })

  it('redirects teacher to /teacher/dashboard', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValueOnce({
      success: true, code: 'OK', message: 'Success', request_id: null,
      data: {
        access_token: 'tok2',
        user: { id: 2, email: 't@t.com', role: 'teacher', first_name: 'T', last_name: 'T', is_active: true, created_at: '2024-01-01' },
      },
      meta: null,
    })

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email/i), 't@t.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/teacher/dashboard'))
  })

  it('redirects admin to /admin/dashboard', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValueOnce({
      success: true, code: 'OK', message: 'Success', request_id: null,
      data: {
        access_token: 'tok3',
        user: { id: 3, email: 'adm@adm.com', role: 'admin', first_name: 'Ad', last_name: 'Min', is_active: true, created_at: '2024-01-01' },
      },
      meta: null,
    })

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email/i), 'adm@adm.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/dashboard'))
  })

  it('shows generic toast on network error (no response)', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValueOnce(new Error('Network Error'))

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Something went wrong')
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows toast error "Invalid email or password" on 401', async () => {
    const user = userEvent.setup()
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: {
        status: 401,
        data: { success: false, code: 'UNAUTHORIZED', message: 'Invalid credentials', data: null, meta: null, request_id: null },
      },
    })
    mockLogin.mockRejectedValueOnce(axiosError)

    render(<LoginForm />)
    await user.type(screen.getByLabelText(/email/i), 'a@b.com')
    await user.type(screen.getByLabelText(/password/i), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Invalid email or password')
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
