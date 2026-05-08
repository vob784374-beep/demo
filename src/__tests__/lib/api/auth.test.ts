import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, register } from '@/lib/api/auth'

vi.mock('@/lib/api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

import { apiClient } from '@/lib/api/client'
const mockPost = vi.mocked(apiClient.post)

describe('auth API', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('login()', () => {
    it('posts to /api/v1/auth/login with email and password', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          success: true, code: 'OK', message: 'Success', request_id: null,
          data: { access_token: 'tok123', user: { id: 1, email: 'a@b.com', role: 'student', first_name: 'A', last_name: 'B', is_active: true, created_at: '2024-01-01' } },
          meta: null,
        },
      })

      const result = await login('a@b.com', 'pass123')
      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/login', { email: 'a@b.com', password: 'pass123' })
      expect(result.data?.access_token).toBe('tok123')
      expect(result.data?.user.role).toBe('student')
    })

    it('propagates axios errors so callers can handle them', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network Error'))
      await expect(login('a@b.com', 'bad')).rejects.toThrow('Network Error')
    })
  })

  describe('register()', () => {
    it('posts to /api/v1/auth/register with snake_case fields', async () => {
      mockPost.mockResolvedValueOnce({
        data: {
          success: true, code: 'OK', message: 'Success', request_id: null,
          data: { id: 2, email: 'x@y.com', role: 'student', access_token: 'tok456', first_name: 'X', last_name: 'Y', is_active: true, created_at: '2024-01-01' },
          meta: null,
        },
      })

      const result = await register('x@y.com', 'pass123', 'Xavier', 'Young')
      expect(mockPost).toHaveBeenCalledWith('/api/v1/auth/register', {
        email: 'x@y.com',
        password: 'pass123',
        first_name: 'Xavier',
        last_name: 'Young',
      })
      expect(result.data?.access_token).toBe('tok456')
    })

    it('propagates axios errors so callers can handle them', async () => {
      mockPost.mockRejectedValueOnce(new Error('Request failed with status code 422'))
      await expect(register('x@y.com', 'pass', 'X', 'Y')).rejects.toThrow()
    })
  })
})
