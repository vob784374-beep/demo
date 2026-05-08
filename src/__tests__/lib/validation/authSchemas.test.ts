import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

describe('loginSchema', () => {
  it('accepts valid email and password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'anypass' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = loginSchema.safeParse({ email: 'notanemail', password: 'anypass' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === 'email')
      expect(emailError?.message).toBe('Please enter a valid email address')
    }
  })

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'anypass' })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passError = result.error.issues.find((i) => i.path[0] === 'password')
      expect(passError?.message).toBe('Password is required')
    }
  })
})

describe('registerSchema', () => {
  const validPayload = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'pass1234',
  }

  it('accepts a fully valid payload', () => {
    expect(registerSchema.safeParse(validPayload).success).toBe(true)
  })

  it('rejects invalid email format', () => {
    const result = registerSchema.safeParse({ ...validPayload, email: 'bad' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === 'email')
      expect(emailError?.message).toBe('Please enter a valid email address')
    }
  })

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({ ...validPayload, password: 'short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const passError = result.error.issues.find((i) => i.path[0] === 'password')
      expect(passError?.message).toBe('Password must be at least 8 characters')
    }
  })

  it('rejects empty first name', () => {
    const result = registerSchema.safeParse({ ...validPayload, firstName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === 'firstName')
      expect(err?.message).toBe('First name is required')
    }
  })

  it('rejects empty last name', () => {
    const result = registerSchema.safeParse({ ...validPayload, lastName: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const err = result.error.issues.find((i) => i.path[0] === 'lastName')
      expect(err?.message).toBe('Last name is required')
    }
  })
})
