import type { UserRole } from '@/types/user'

const VALID_ROLES = new Set<UserRole>(['student', 'teacher', 'admin'])

export function decodeJwtRole(token: string): UserRole | null {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'))
    const payload = JSON.parse(json) as Record<string, unknown>
    const role = payload.role
    return typeof role === 'string' && VALID_ROLES.has(role as UserRole)
      ? (role as UserRole)
      : null
  } catch {
    return null
  }
}
