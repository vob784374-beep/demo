import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

function makeRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const url = `http://localhost:3000${pathname}`
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ')
  return new NextRequest(url, cookieHeader ? { headers: { Cookie: cookieHeader } } : {})
}

describe('proxy', () => {
  describe('unauthenticated (no lms-auth cookie)', () => {
    it('redirects /student/dashboard to /login', () => {
      const res = proxy(makeRequest('/student/dashboard'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })

    it('redirects /teacher/dashboard to /login', () => {
      const res = proxy(makeRequest('/teacher/dashboard'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })

    it('redirects /admin/dashboard to /login', () => {
      const res = proxy(makeRequest('/admin/dashboard'))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })

    it('allows /login through', () => {
      const res = proxy(makeRequest('/login'))
      expect(res.status).toBe(200)
    })

    it('allows /register through', () => {
      const res = proxy(makeRequest('/register'))
      expect(res.status).toBe(200)
    })

    it('allows / through', () => {
      const res = proxy(makeRequest('/'))
      expect(res.status).toBe(200)
    })
  })

  describe('authenticated (lms-auth=1 cookie present)', () => {
    const auth = { 'lms-auth': '1' }

    it('allows /student/dashboard through', () => {
      const res = proxy(makeRequest('/student/dashboard', auth))
      expect(res.status).toBe(200)
    })

    it('allows /teacher/dashboard through', () => {
      const res = proxy(makeRequest('/teacher/dashboard', auth))
      expect(res.status).toBe(200)
    })

    it('allows /admin/dashboard through', () => {
      const res = proxy(makeRequest('/admin/dashboard', auth))
      expect(res.status).toBe(200)
    })

    it('redirects /login to /student/dashboard', () => {
      const res = proxy(makeRequest('/login', auth))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/student/dashboard')
    })

    it('redirects /register to /student/dashboard', () => {
      const res = proxy(makeRequest('/register', auth))
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/student/dashboard')
    })
  })
})
