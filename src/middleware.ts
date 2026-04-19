import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Route guard — full implementation in Story 2.6
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*'],
}
