'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { refreshToken } from '@/lib/api/auth'
import type { UserRole } from '@/types/user'

const ROLE_DASHBOARD: Record<UserRole, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  admin: '/admin/dashboard',
}

interface RoleGuardProps {
  requiredRoles: UserRole[]
  children: React.ReactNode
}

export function RoleGuard({ requiredRoles, children }: RoleGuardProps) {
  const router = useRouter()
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [ready, setReady] = useState(false)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function init() {
      let role = useAuthStore.getState().role

      if (!role) {
        try {
          const data = await refreshToken()
          const token = data.data?.access_token
          if (token) {
            setAccessToken(token)
            role = useAuthStore.getState().role
          }
        } catch {
          // refresh failed — treat as logged out
        }
      }

      if (!role) {
        clearAuth()
        router.replace('/login')
        setReady(true)
        return
      }

      if (!requiredRoles.includes(role)) {
        router.replace(ROLE_DASHBOARD[role] ?? '/login')
        setReady(true)
        return
      }

      setAuthorized(true)
      setReady(true)
    }

    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !authorized) return null

  return <>{children}</>
}
