import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/api/auth', () => ({ register: vi.fn() }))
vi.mock('@/lib/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({ setAuth: vi.fn() })),
}))
vi.mock('next/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn() })) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { RegisterForm } from '@/components/auth/RegisterForm'
import { register } from '@/lib/api/auth'
import { useAuthStore } from '@/lib/stores/authStore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const mockRegister = vi.mocked(register)
const mockUseAuthStore = vi.mocked(useAuthStore)
const mockUseRouter = vi.mocked(useRouter)

describe('RegisterForm', () => {
  let mockSetAuth: ReturnType<typeof vi.fn>
  let mockPush: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSetAuth = vi.fn()
    mockPush = vi.fn()
    mockUseAuthStore.mockReturnValue({ setAuth: mockSetAuth } as ReturnType<typeof useAuthStore>)
    mockUseRouter.mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>)
  })

  it('renders all four fields', () => {
    render(<RegisterForm />)
    expect(screen.getByLabelText(/first name/i)).toBeDefined()
    expect(screen.getByLabelText(/last name/i)).toBeDefined()
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(screen.getByLabelText(/password/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /create account/i })).toBeDefined()
  })

  it('shows inline error for invalid email without calling API', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'bademail')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeDefined()
    })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('shows error when password is too short', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)

    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@doe.com')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeDefined()
    })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('calls register, setAuth, and redirects to /student/dashboard on success', async () => {
    const user = userEvent.setup()
    mockRegister.mockResolvedValueOnce({
      success: true, code: 'OK', message: 'Success', request_id: null,
      data: {
        id: 5,
        email: 'john@doe.com',
        role: 'student',
        access_token: 'newtok',
        first_name: 'John',
        last_name: 'Doe',
        is_active: true,
        created_at: '2024-01-01',
      },
      meta: null,
    })

    render(<RegisterForm />)
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@doe.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('john@doe.com', 'password123', 'John', 'Doe')
      expect(mockSetAuth).toHaveBeenCalledWith(
        { id: 5, email: 'john@doe.com', firstName: 'John', lastName: 'Doe', isActive: true, createdAt: '2024-01-01' },
        'student',
        'newtok',
      )
      expect(mockPush).toHaveBeenCalledWith('/student/dashboard')
    })
  })

  it('shows generic toast on network error (no response)', async () => {
    const user = userEvent.setup()
    mockRegister.mockRejectedValueOnce(new Error('Network Error'))

    render(<RegisterForm />)
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@doe.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Something went wrong')
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows toast with message on API error', async () => {
    const user = userEvent.setup()
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: {
        status: 422,
        data: { success: false, code: 'VALIDATION_ERROR', message: 'Email already registered', data: null, meta: null, request_id: null },
      },
    })
    mockRegister.mockRejectedValueOnce(axiosError)

    render(<RegisterForm />)
    await user.type(screen.getByLabelText(/first name/i), 'John')
    await user.type(screen.getByLabelText(/last name/i), 'Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@doe.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Email already registered')
    })
    expect(mockPush).not.toHaveBeenCalled()
  })
})
