'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'

interface Lesson {
  id: number
  course_id: number
  title: string
  content: string | null
  order: number
}

export default function LessonDetailPage() {
  const params = useParams()
  const courseId = Number(params.id)
  const lessonId = Number(params.lessonId)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchLesson() {
      try {
        const res = await apiClient.get<ApiResponse<Lesson>>(`/api/v1/courses/${courseId}/lessons/${lessonId}`)
        setLesson(res.data.data)
      } catch (err) {
        setError('Failed to load lesson')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchLesson()
  }, [courseId, lessonId])

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

  if (error || !lesson) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10">
        <div className="text-red-500">{error || 'Lesson not found'}</div>
        <Link href={`/student/courses/${courseId}`} className="text-primary hover:underline">
          &larr; Back to course
        </Link>
      </div>
    )
  }

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <div className="mb-4">
        <Link href={`/student/courses/${courseId}`}>
          <button className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to course
          </button>
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-4">{lesson.title}</h1>
      
      <div className="prose prose-sm max-w-none">
        {lesson.content ? (
          <div className="whitespace-pre-wrap">{lesson.content}</div>
        ) : (
          <p className="text-muted-foreground">No content available for this lesson.</p>
        )}
      </div>
    </main>
  )
}