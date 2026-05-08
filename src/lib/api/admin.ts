import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'

export interface AdminStats {
  total_users: number
  active_users: number
  student_count: number
  teacher_count: number
  admin_count: number
  total_courses: number
  total_enrollments: number
  active_last_30_days: number
}

export interface UserListItem {
  id: number
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  role: string
  created_at: string | null
  updated_at: string | null
}

export interface UserListResponse {
  users: UserListItem[]
  meta: {
    page: number
    per_page: number
    total: number
    pages: number
  }
}

export async function fetchAdminStats(): Promise<AdminStats | null> {
  try {
    const res = await apiClient.get<ApiResponse<AdminStats>>('/api/v1/users/stats')
    return res.data.data
  } catch (error) {
    console.error('Failed to fetch admin stats:', error)
    return null
  }
}

export async function fetchUsers(page = 1, perPage = 20, search?: string): Promise<UserListResponse | null> {
  try {
    const params = new URLSearchParams()
    params.set('page', String(page))
    params.set('per_page', String(perPage))
    if (search) {
      params.set('search', search)
    }
    
    const res = await apiClient.get<ApiResponse<UserListResponse>>(`/api/v1/users?${params}`)
    return res.data.data
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return null
  }
}

export interface UserCreate {
  email: string
  password: string
  first_name: string
  last_name: string
  role?: string
  is_active?: boolean
}

export async function createUser(data: UserCreate): Promise<UserListItem | null> {
  try {
    const res = await apiClient.post<ApiResponse<UserListItem>>('/api/v1/users', data)
    return res.data.data
  } catch (error) {
    console.error('Failed to create user:', error)
    return null
  }
}

export async function updateUser(userId: number, data: { role?: string; is_active?: boolean }): Promise<UserListItem | null> {
  try {
    const res = await apiClient.patch<ApiResponse<UserListItem>>(`/api/v1/users/${userId}`, data)
    return res.data.data
  } catch (error) {
    console.error('Failed to update user:', error)
    return null
  }
}