'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/authStore'

export function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (hasHydrated) {
      setChecked(true)
      if (!user) {
        router.replace('/login')
      }
    }
  }, [hasHydrated, user, router])

  if (!checked || !hasHydrated) {
    return null
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}