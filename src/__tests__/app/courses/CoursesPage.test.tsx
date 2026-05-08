import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Course } from '@/types/course'
import type { PaginationMeta } from '@/types/api'

vi.mock('@/lib/api/courses', () => ({ fetchCourses: vi.fn() }))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

import CoursesPage from '@/app/courses/page'
import { fetchCourses } from '@/lib/api/courses'

const mockFetchCourses = vi.mocked(fetchCourses)

function makeMeta(page = 1, total = 0, per_page = 20): PaginationMeta {
  return { page, per_page, total }
}

function makeCourse(id: number, title: string): Course {
  return {
    id, teacher_id: 1, title, description: `Desc for ${title}`,
    category: 'Test', is_published: true, created_at: '', updated_at: '',
  }
}

describe('CoursesPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders course cards for each published course', async () => {
    mockFetchCourses.mockResolvedValueOnce({
      courses: [makeCourse(1, 'Spanish 101'), makeCourse(2, 'French 101')],
      meta: makeMeta(1, 2),
    })

    render(await CoursesPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText('Spanish 101')).toBeDefined()
    expect(screen.getByText('French 101')).toBeDefined()
  })

  it('shows empty state when no courses exist', async () => {
    mockFetchCourses.mockResolvedValueOnce({ courses: [], meta: makeMeta() })

    render(await CoursesPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText(/no courses available/i)).toBeDefined()
  })

  it('shows pagination when total exceeds per_page', async () => {
    const courses = Array.from({ length: 20 }, (_, i) => makeCourse(i + 1, `Course ${i + 1}`))
    mockFetchCourses.mockResolvedValueOnce({ courses, meta: makeMeta(1, 42) })

    render(await CoursesPage({ searchParams: Promise.resolve({}) }))

    expect(screen.getByText(/page 1 of 3/i)).toBeDefined()
    expect(screen.getByRole('link', { name: /next/i })).toBeDefined()
  })

  it('hides Previous on first page', async () => {
    const courses = Array.from({ length: 20 }, (_, i) => makeCourse(i + 1, `Course ${i + 1}`))
    mockFetchCourses.mockResolvedValueOnce({ courses, meta: makeMeta(1, 42) })

    render(await CoursesPage({ searchParams: Promise.resolve({}) }))

    expect(screen.queryByRole('link', { name: /previous/i })).toBeNull()
  })

  it('hides Next on last page and shows Previous', async () => {
    const courses = Array.from({ length: 2 }, (_, i) => makeCourse(i + 1, `Course ${i + 1}`))
    mockFetchCourses.mockResolvedValueOnce({ courses, meta: makeMeta(3, 42) })

    render(await CoursesPage({ searchParams: Promise.resolve({ page: '3' }) }))

    expect(screen.queryByRole('link', { name: /next/i })).toBeNull()
    expect(screen.getByRole('link', { name: /previous/i })).toBeDefined()
  })

  it('defaults to page 1 when searchParams.page is absent', async () => {
    mockFetchCourses.mockResolvedValueOnce({ courses: [], meta: makeMeta() })
    await CoursesPage({ searchParams: Promise.resolve({}) })
    expect(mockFetchCourses).toHaveBeenCalledWith(1)
  })

  it('reads page number from searchParams', async () => {
    mockFetchCourses.mockResolvedValueOnce({ courses: [], meta: makeMeta(2, 42) })
    await CoursesPage({ searchParams: Promise.resolve({ page: '2' }) })
    expect(mockFetchCourses).toHaveBeenCalledWith(2)
  })
})
