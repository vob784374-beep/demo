import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { decodeJwtRole } from '@/lib/token'
import type { User, UserRole } from '@/types/user'

const AUTH_COOKIE = 'lms-auth'

function setAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=604800; samesite=lax`
  }
}

function clearAuthCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`
  }
}

interface AuthState {
  user: User | null
  role: UserRole | null
  accessToken: string | null
  _hasHydrated: boolean
  setAuth: (user: User, role: UserRole, accessToken: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  setHasHydrated: (state: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      accessToken: null,
      _hasHydrated: false,
      setAuth: (user, role, accessToken) => {
        setAuthCookie()
        set({ user, role, accessToken })
      },
      setAccessToken: (accessToken) => {
        const role = decodeJwtRole(accessToken)
        set({ accessToken, ...(role ? { role } : {}) })
      },
      clearAuth: () => {
        clearAuthCookie()
        set({ user: null, role: null, accessToken: null })
      },
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'lms-auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export const selectAuth = (state: AuthState) => state.user !== null
