import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CourseCard } from '@/components/catalog/CourseCard'
import type { Course } from '@/types/course'

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

const baseCourse: Course = {
  id: 1,
  teacher_id: 2,
  title: 'Introduction to Spanish',
  description: 'Learn Spanish from scratch.',
  category: 'Language',
  is_published: true,
  created_at: '2024-01-01T00:00:00',
  updated_at: '2024-01-01T00:00:00',
}

describe('CourseCard', () => {
  it('renders title and category badge', () => {
    render(<CourseCard course={baseCourse} />)
    expect(screen.getByText('Introduction to Spanish')).toBeDefined()
    expect(screen.getByText('Language')).toBeDefined()
  })

  it('renders description when present', () => {
    render(<CourseCard course={baseCourse} />)
    expect(screen.getByText('Learn Spanish from scratch.')).toBeDefined()
  })

  it('renders "Log in to enroll" CTA linking to /login', () => {
    render(<CourseCard course={baseCourse} />)
    const link = screen.getByRole('link', { name: /log in to enroll/i })
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/login')
  })

  it('omits description when null', () => {
    render(<CourseCard course={{ ...baseCourse, description: null }} />)
    expect(screen.queryByText('Learn Spanish from scratch.')).toBeNull()
  })

  it('omits category badge when null', () => {
    render(<CourseCard course={{ ...baseCourse, category: null }} />)
    expect(screen.queryByText('Language')).toBeNull()
  })
})
