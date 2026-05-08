import type { Metadata } from 'next'
import Link from 'next/link'
import { CourseCard } from '@/components/catalog/CourseCard'
import { fetchCourses } from '@/lib/api/courses'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Course Catalog | LMS App',
  description: 'Browse all available courses',
}

interface CoursesPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)

  const { courses, meta } = await fetchCourses(page)
  const totalPages = Math.ceil(meta.total / meta.per_page)

  return (
    <>
      <Header user={null} />
      <main className="container mx-auto max-w-6xl px-4 py-10 page-content">
      <h1 className="text-3xl font-bold mb-8 animate-fade-in-up">Course Catalog</h1>

      {courses.length === 0 ? (
        <p className="text-center text-muted-foreground py-20">No courses available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex justify-center items-center gap-2">
          {page > 1 && (
            <Link href={`/courses?page=${page - 1}`}>
              <Button variant="outline" size="sm">Previous</Button>
            </Link>
          )}
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/courses?page=${page + 1}`}>
              <Button variant="outline" size="sm">Next</Button>
            </Link>
          )}
        </nav>
      )}
    </main>
    </>
  )
}
