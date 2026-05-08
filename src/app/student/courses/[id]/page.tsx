'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EnrollButton } from '@/components/catalog/EnrollButton'
import { fetchCourse, fetchCourseLessons } from '@/lib/api/courses'

interface CourseDetailPageProps {
  params: Promise<{ id: string }>
}

export default function StudentCourseDetailPage({ params }: CourseDetailPageProps) {
  const { id } = use(params)
  const [courseId, setCourseId] = useState<number | null>(null)
  const [course, setCourse] = useState<any>(null)
  const [lessons, setLessons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cid = Number(id)
    setCourseId(cid)
    fetchCourse(cid)
      .then((courseData) => {
        setCourse(courseData)
        if (courseData?.is_enrolled) {
          return fetchCourseLessons(cid)
        }
        return []
      })
      .then((lessonsData) => {
        setLessons(lessonsData)
      })
      .catch((err) => {
        console.error('Failed to load course:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!course) return notFound()

  const isEnrolled = course.is_enrolled === true

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4">
        <Link href="/student/courses">
          <Button variant="ghost" size="sm" className="-ml-2">&larr; Back to my courses</Button>
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

      {!isEnrolled ? (
        <EnrollButton courseId={course.id} />
      ) : (
        <div className="mt-8" id="course-content">
          <h2 className="text-xl font-semibold mb-4">Course Content</h2>
          <div className="space-y-3">
            {lessons.length > 0 ? (
              lessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  href={`/student/courses/${course.id}/lessons/${lesson.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{lesson.title}</h3>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-muted-foreground">No lessons available yet.</p>
            )}
          </div>
        </div>
      )}
    </main>
  )
}