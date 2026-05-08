import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { CourseDetail } from '@/types/course'

vi.mock('@/lib/api/courses', () => ({ fetchCourse: vi.fn() }))
vi.mock('@/components/catalog/EnrollButton', () => ({
  EnrollButton: ({ courseId }: { courseId: number }) => (
    <button>EnrollButton-{courseId}</button>
  ),
}))
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))
vi.mock('next/navigation', () => ({
  notFound: vi.fn().mockImplementation(() => { throw new Error('NEXT_NOT_FOUND') }),
}))

import CourseDetailPage from '@/app/courses/[id]/page'
import { fetchCourse } from '@/lib/api/courses'
import { notFound } from 'next/navigation'

const mockFetchCourse = vi.mocked(fetchCourse)

const baseCourse: CourseDetail = {
  id: 1, teacher_id: 2,
  title: 'Spanish 101',
  description: 'Learn Spanish from scratch.',
  category: 'Language',
  is_published: true,
  lesson_count: 3,
  teacher_name: 'Alice Teacher',
  is_enrolled: null,
  created_at: '', updated_at: '',
}

describe('CourseDetailPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders title, category, teacher, lesson count, and description', async () => {
    mockFetchCourse.mockResolvedValueOnce(baseCourse)
    render(await CourseDetailPage({ params: Promise.resolve({ id: '1' }) }))

    expect(screen.getByText('Spanish 101')).toBeDefined()
    expect(screen.getByText('Language')).toBeDefined()
    expect(screen.getByText('By Alice Teacher')).toBeDefined()
    expect(screen.getByText('3 lessons')).toBeDefined()
    expect(screen.getByText('Learn Spanish from scratch.')).toBeDefined()
  })

  it('calls notFound when course is null (404)', async () => {
    mockFetchCourse.mockResolvedValueOnce(null)
    await expect(
      CourseDetailPage({ params: Promise.resolve({ id: '999' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(vi.mocked(notFound)).toHaveBeenCalled()
  })

  it('renders EnrollButton with correct courseId', async () => {
    mockFetchCourse.mockResolvedValueOnce(baseCourse)
    render(await CourseDetailPage({ params: Promise.resolve({ id: '1' }) }))
    expect(screen.getByText('EnrollButton-1')).toBeDefined()
  })

  it('shows "1 lesson" (singular) when lesson_count is 1', async () => {
    mockFetchCourse.mockResolvedValueOnce({ ...baseCourse, lesson_count: 1 })
    render(await CourseDetailPage({ params: Promise.resolve({ id: '1' }) }))
    expect(screen.getByText('1 lesson')).toBeDefined()
  })

  it('omits description section when null', async () => {
    mockFetchCourse.mockResolvedValueOnce({ ...baseCourse, description: null })
    render(await CourseDetailPage({ params: Promise.resolve({ id: '1' }) }))
    expect(screen.queryByText('Learn Spanish from scratch.')).toBeNull()
  })

  it('omits category badge when null', async () => {
    mockFetchCourse.mockResolvedValueOnce({ ...baseCourse, category: null })
    render(await CourseDetailPage({ params: Promise.resolve({ id: '1' }) }))
    expect(screen.queryByText('Language')).toBeNull()
  })
})
