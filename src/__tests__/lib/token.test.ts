import { describe, it, expect } from 'vitest'
import { decodeJwtRole } from '@/lib/token'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fakesig`
}

describe('decodeJwtRole', () => {
  it('returns student for a JWT with role=student', () => {
    const token = makeJwt({ sub: '1', role: 'student' })
    expect(decodeJwtRole(token)).toBe('student')
  })

  it('returns teacher for a JWT with role=teacher', () => {
    const token = makeJwt({ sub: '2', role: 'teacher' })
    expect(decodeJwtRole(token)).toBe('teacher')
  })

  it('returns admin for a JWT with role=admin', () => {
    const token = makeJwt({ sub: '3', role: 'admin' })
    expect(decodeJwtRole(token)).toBe('admin')
  })

  it('returns null for an unknown role', () => {
    const token = makeJwt({ sub: '4', role: 'superuser' })
    expect(decodeJwtRole(token)).toBeNull()
  })

  it('returns null when role claim is missing', () => {
    const token = makeJwt({ sub: '5' })
    expect(decodeJwtRole(token)).toBeNull()
  })

  it('returns null for a malformed token (no dots)', () => {
    expect(decodeJwtRole('notavalidtoken')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(decodeJwtRole('')).toBeNull()
  })

  it('returns null for a token with non-base64 payload', () => {
    expect(decodeJwtRole('header.!!!.sig')).toBeNull()
  })
})
