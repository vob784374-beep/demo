"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/stores/authStore"
import { signOut } from "@/lib/api/auth"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const ROLE_DASHBOARD: Record<string, string> = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  admin: '/admin/dashboard',
}

const ROLE_COURSES: Record<string, string> = {
  student: '/student/courses',
  teacher: '/teacher/courses',
  admin: '/admin/dashboard',
}

interface HeaderProps {
  user?: {
    name: string
    email: string
    role: string
  } | null
}

export function Header({ user: propUser }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const authUser = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  
  const user = hasHydrated ? (authUser ?? propUser) : null
  const role = useAuthStore((s) => s.role)
  
  if (!hasHydrated) {
    return null
  }
  
  const dashboardUrl = role ? ROLE_DASHBOARD[role] : '/system/auth/login'
  const coursesUrl = role ? ROLE_COURSES[role] : '/system/auth/login'

  const getUserName = () => {
    if (!user) return 'User'
    if ('firstName' in user && user.firstName) {
      const lastName = 'lastName' in user ? (user as { lastName?: string }).lastName : undefined
      return `${user.firstName} ${lastName ?? ''}`.trim()
    }
    if ('name' in user && user.name) {
      return user.name
    }
    return 'User'
  }
  const userName = getUserName()

  const handleLogout = async () => {
    try {
      await signOut()
    } finally {
      clearAuth()
      router.push('/system/auth/login')
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-gradient-to-r from-primary/95 to-primary/90 backdrop-blur-sm shadow-sm">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
        {/* Left: Logo & Navigation */}
        <div className="flex items-center gap-8">
          <Link
            href={dashboardUrl}
            className="group flex items-center gap-2.5 transition-transform duration-200 hover:scale-105"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm shadow-sm transition-all group-hover:bg-white/30 group-hover:scale-110">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-white"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                <path d="M8 7h6" />
                <path d="M8 11h8" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold leading-tight tracking-tight text-white">
                LMS
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/75">
                Learning Platform
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <Link
              href={coursesUrl}
              className={cn(
                "relative px-4 py-2 font-medium transition-all duration-200 rounded-lg link-underline",
                pathname?.startsWith('/student/courses') || pathname?.startsWith('/teacher/courses')
                  ? "text-white bg-white/20 shadow-sm"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              Courses
            </Link>
          </nav>
        </div>

        {/* Right: User Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden flex-col items-end sm:flex">
                <span className="text-sm font-semibold text-white">
                  {userName}
                </span>
                <span className="text-xs text-white/75 capitalize">
                  {role}
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/20 text-sm font-bold text-white shadow-sm">
                {userName?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <Link href={dashboardUrl}>
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                >
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={handleLogout}
                className="bg-white/10 hover:bg-white/20 text-white border-white/10 backdrop-blur-sm"
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/system/auth/login">
                <Button 
                  variant="secondary" 
                  size="sm"
                  className="bg-white/20 hover:bg-white/30 text-white border-white/20 backdrop-blur-sm"
                >
                  Sign in
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
