import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const AUTH_COOKIE = 'lms-auth'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthenticated = request.cookies.has(AUTH_COOKIE)

  const isAuthPage = pathname.startsWith('/system/auth/login') || pathname.startsWith('/system/auth/register')

  if (pathname === '/courses') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/student/courses', request.url))
    }
    return NextResponse.redirect(new URL('/system/auth/login', request.url))
  }

  if (pathname === '/' && isAuthenticated) {
    return NextResponse.redirect(new URL('/student/courses', request.url))
  }

  if (pathname === '/' && !isAuthenticated) {
    return NextResponse.redirect(new URL('/system/auth/login', request.url))
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/student/courses', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/courses',
    '/student/courses',
    '/system/auth/:path*',
    '/student/:path*',
    '/teacher/:path*',
    '/admin/:path*',
  ],
}
