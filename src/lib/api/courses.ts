import type { ApiResponse, PaginationMeta } from '@/types/api'
import type { Course, CourseDetail, CourseCategory } from '@/types/course'
import { SEED_COURSES, SEED_LESSONS } from '@/lib/data/seed'

export interface CourseListData {
  courses: Course[]
  meta: PaginationMeta
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>) {
  let url = path
  if (params) {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) search.set(key, String(value))
    })
    const query = search.toString()
    if (query) url += '?' + query
  }
  // If path is already absolute, return as is; otherwise prepend base URL
  if (!path.startsWith('http') && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') + url
  }
  return url
}

export async function fetchCourses(page = 1, perPage = 20, category?: CourseCategory): Promise<CourseListData> {
  try {
    const url = buildUrl('/api/v1/courses', { page, per_page: perPage, category })
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) throw new Error(`Failed to fetch courses: ${res.status}`)
    const body: ApiResponse<Course[]> = await res.json()

    if (body.data && body.data.length > 0) {
      return {
        courses: body.data,
        meta: body.meta ?? { page, per_page: perPage, total: body.data.length },
      }
    }
  } catch (error) {
    console.warn('API unavailable, using seed data:', error)
  }

  let courses = [...SEED_COURSES]
  if (category) {
    courses = courses.filter(c => c.category === category)
  }
  const start = (page - 1) * perPage
  const paginatedCourses = courses.slice(start, start + perPage)

  return {
    courses: paginatedCourses,
    meta: { page, per_page: perPage, total: courses.length },
  }
}

export async function fetchCourse(id: number): Promise<CourseDetail | null> {
  try {
    const res = await fetch(buildUrl(`/api/v1/courses/${id}`), {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`Failed to fetch course: ${res.status}`)
    const body: ApiResponse<CourseDetail> = await res.json()
    return body.data
  } catch (error) {
    console.warn('API unavailable, using seed data:', error)
  }

  const course = SEED_COURSES.find(c => c.id === id)
  if (!course) return null

  const lessons = SEED_LESSONS[id] ?? []

  return {
    ...course,
    lesson_count: lessons.length,
    teacher_name: 'Teacher',
    is_enrolled: null,
  }
}

export async function fetchCourseLessons(courseId: number) {
  try {
    const res = await fetch(buildUrl(`/api/v1/courses/${courseId}/lessons`), {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error(`Failed to fetch lessons: ${res.status}`)
    const body: ApiResponse<unknown[]> = await res.json()
    return body.data ?? []
  } catch (error) {
    console.warn('API unavailable, using seed data:', error)
  }

  return SEED_LESSONS[courseId] ?? []
}