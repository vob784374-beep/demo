import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { UserRole } from '@/types/user'

interface BackendUser {
  id: number
  email: string
  role: UserRole
  first_name: string
  last_name: string
  is_active: boolean
  created_at: string
}

export interface LoginResponseData {
  access_token: string
  user: BackendUser
}

export interface RegisterResponseData extends BackendUser {
  access_token: string
}

export async function login(email: string, password: string) {
  const res = await apiClient.post<ApiResponse<LoginResponseData>>('/api/v1/auth/login', { email, password })
  return res.data
}

export async function refreshToken() {
  const res = await apiClient.post<ApiResponse<{ access_token: string }>>('/api/v1/auth/refresh')
  return res.data
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  const res = await apiClient.post<ApiResponse<RegisterResponseData>>('/api/v1/auth/register', {
    email,
    password,
    first_name: firstName,
    last_name: lastName,
  })
  return res.data
}

export async function signOut() {
  try {
    const res = await apiClient.post<ApiResponse<null>>('/api/v1/auth/logout')
    return res.data
  } catch (error) {
    return { success: true, data: null }
  }
}
