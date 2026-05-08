import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'

const API_BASE = ''

export interface Permission {
  id: number
  name: string
  description: string | null
  category: string
  created_at: string
}

export interface RoleWithPermissions {
  id: number
  name: string
  description: string | null
  permissions: Permission[]
  user_count: number
  created_at: string
}

export interface PermissionCategory {
  category: string
  permissions: Permission[]
}

export interface RolePermissions {
  role: string
  permissions: string[]
}

export interface PermissionUpdateResponse {
  message: string
  assigned_count?: number
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  let url = `${API_BASE}${path}`
  if (params) {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) search.set(key, String(value))
    })
    const query = search.toString()
    if (query) url += '?' + query
  }
  return url
}

export async function fetchPermissionCategories(): Promise<Record<string, Permission[]>> {
  const res = await apiClient.get<ApiResponse<{ categories: Record<string, Permission[]> }>>(buildUrl('/api/v1/permissions/all'))
  return res.data.data?.categories ?? {}
}

export async function fetchAllPermissions(): Promise<Permission[]> {
  const res = await apiClient.get<ApiResponse<{ permissions: Permission[] }>>(buildUrl('/api/v1/permissions/flat'))
  return res.data.data?.permissions ?? []
}

export async function fetchRolesWithPermissions(): Promise<RoleWithPermissions[]> {
  const res = await apiClient.get<ApiResponse<{ roles: RoleWithPermissions[] }>>(buildUrl('/api/v1/permissions/roles'))
  return res.data.data?.roles ?? []
}

export async function fetchRolePermissions(roleName: string): Promise<RolePermissions> {
  const res = await apiClient.get<ApiResponse<{ role: RolePermissions }>>(buildUrl(`/api/v1/permissions/roles/${roleName}`))
  return res.data.data?.role ?? { role: roleName, permissions: [] }
}

export interface PermissionCreate {
  name: string
  description?: string | null
  category: string
}

export async function createPermission(data: PermissionCreate): Promise<Permission | null> {
  try {
    const res = await apiClient.post<ApiResponse<Permission>>('/api/v1/permissions', data)
    return res.data.data
  } catch (error) {
    console.error('Failed to create permission:', error)
    return null
  }
}

export interface RoleCreate {
  name: string
  description?: string | null
}

export async function createRole(data: RoleCreate): Promise<{ id: number; name: string; description: string | null } | null> {
  try {
    const res = await apiClient.post<ApiResponse<{ id: number; name: string; description: string | null }>>('/api/v1/roles', data)
    return res.data.data
  } catch (error) {
    console.error('Failed to create role:', error)
    return null
  }
}

export async function updateRolePermissions(
  roleName: string, 
  permissionNames: string[]
): Promise<PermissionUpdateResponse> {
  const res = await apiClient.put<ApiResponse<PermissionUpdateResponse>>(
    buildUrl(`/api/v1/permissions/roles/${roleName}`),
    { permissions: permissionNames }
  )
  return res.data.data ?? { message: 'Updated' }
}

export async function addPermissionToRole(
  roleName: string, 
  permissionName: string
): Promise<void> {
  await apiClient.post(
    buildUrl(`/api/v1/permissions/roles/${roleName}/permissions/${permissionName}`),
    {}
  )
}

export async function removePermissionFromRole(
  roleName: string, 
  permissionName: string
): Promise<void> {
  await apiClient.delete(
    buildUrl(`/api/v1/permissions/roles/${roleName}/permissions/${permissionName}`)
  )
}