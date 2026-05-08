import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EnrollButton } from '@/components/catalog/EnrollButton'
import { fetchCourse } from '@/lib/api/courses'

export const revalidate = 60

interface CourseDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: CourseDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const course = await fetchCourse(Number(id))
  if (!course) return { title: 'Course Not Found | LMS App' }
  return {
    title: `${course.title} | LMS App`,
    description: course.description ?? undefined,
  }
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = await params
  const course = await fetchCourse(Number(id))
  if (!course) notFound()

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4">
        <Link href="/courses">
          <Button variant="ghost" size="sm" className="-ml-2">&larr; Back to catalog</Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-start gap-3 mb-4">
        <h1 className="text-3xl font-bold flex-1">{course.title}</h1>
        {course.category && (
          <Badge variant="secondary" className="mt-1">{course.category}</Badge>
        )}
      </div>

      {course.teacher_name && (
        <p className="text-sm text-muted-foreground mb-1">
          By {course.teacher_name}
        </p>
      )}
      <p className="text-sm text-muted-foreground mb-6">
        {course.lesson_count} {course.lesson_count === 1 ? 'lesson' : 'lessons'}
      </p>

      {course.description && (
        <p className="text-base text-foreground leading-relaxed mb-8">
          {course.description}
        </p>
      )}

      <EnrollButton courseId={course.id} />
    </main>
  )
}
