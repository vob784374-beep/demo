import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/api/client', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))
vi.mock('@/lib/stores/authStore', () => ({ useAuthStore: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { EnrollButton } from '@/components/catalog/EnrollButton'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/lib/stores/authStore'
import { toast } from 'sonner'

const mockGet = vi.mocked(apiClient.get)
const mockPost = vi.mocked(apiClient.post)
const mockUseAuthStore = vi.mocked(useAuthStore)

function mockAuth(token: string | null) {
  mockUseAuthStore.mockReturnValue({ accessToken: token } as ReturnType<typeof useAuthStore>)
}

function mockCourseDetail(isEnrolled: boolean | null) {
  mockGet.mockResolvedValueOnce({
    data: {
      success: true, code: 'OK', message: 'Success', request_id: null,
      data: { id: 1, is_enrolled: isEnrolled },
      meta: null,
    },
  } as never)
}

describe('EnrollButton', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows "Log in to enroll" link when unauthenticated', async () => {
    mockAuth(null)
    render(<EnrollButton courseId={1} />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /log in to enroll/i })).toBeDefined()
    })
    expect(screen.getByRole('link', { name: /log in to enroll/i }).getAttribute('href')).toBe('/login')
  })

  it('shows "Enroll Now" button when logged in and not enrolled', async () => {
    mockAuth('tok')
    mockCourseDetail(false)
    render(<EnrollButton courseId={1} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /enroll now/i })).toBeDefined()
    })
  })

  it('shows "Continue Learning" link when already enrolled', async () => {
    mockAuth('tok')
    mockCourseDetail(true)
    render(<EnrollButton courseId={1} />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /continue learning/i })).toBeDefined()
    })
  })

  it('calls enroll API and switches to "Continue Learning" on success', async () => {
    const user = userEvent.setup()
    mockAuth('tok')
    mockCourseDetail(false)
    mockPost.mockResolvedValueOnce({ data: { success: true } } as never)

    render(<EnrollButton courseId={1} />)
    await waitFor(() => screen.getByRole('button', { name: /enroll now/i }))
    await user.click(screen.getByRole('button', { name: /enroll now/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /continue learning/i })).toBeDefined()
    })
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Enrolled successfully!')
  })

  it('shows error toast and stays on "Enroll Now" when enroll fails', async () => {
    const user = userEvent.setup()
    mockAuth('tok')
    mockCourseDetail(false)
    const axiosError = Object.assign(new Error('Request failed'), {
      isAxiosError: true,
      response: {
        status: 422,
        data: { success: false, code: 'VALIDATION_ERROR', message: 'Already enrolled in this course', data: null, meta: null, request_id: null },
      },
    })
    mockPost.mockRejectedValueOnce(axiosError)

    render(<EnrollButton courseId={1} />)
    await waitFor(() => screen.getByRole('button', { name: /enroll now/i }))
    await user.click(screen.getByRole('button', { name: /enroll now/i }))

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Already enrolled in this course')
    })
    expect(screen.getByRole('button', { name: /enroll now/i })).toBeDefined()
  })
})
