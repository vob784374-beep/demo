'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/lib/stores/authStore'
import type { ApiResponse } from '@/types/api'
import type { CourseDetail } from '@/types/course'

type Status = 'loading' | 'unauthenticated' | 'not-enrolled' | 'enrolling' | 'enrolled'

interface EnrollButtonProps {
  courseId: number
}

export function EnrollButton({ courseId }: EnrollButtonProps) {
  const { accessToken } = useAuthStore()
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    if (!accessToken) {
      setStatus('unauthenticated')
      return
    }
    apiClient
      .get<ApiResponse<CourseDetail>>(`/api/v1/courses/${courseId}`)
      .then((res) => {
        setStatus(res.data.data?.is_enrolled ? 'enrolled' : 'not-enrolled')
      })
      .catch((err) => {
        console.error('Failed to check course:', err)
        setStatus('not-enrolled')
      })
  }, [courseId, accessToken])

  const handleEnroll = async () => {
    setStatus('enrolling')
    try {
      console.log('Enrolling to course:', courseId)
      const res = await apiClient.post(`/api/v1/courses/${courseId}/enroll`)
      console.log('Enroll response:', res.status, res.data)
      setStatus('enrolled')
      toast.success('Enrolled successfully!')
      setTimeout(() => window.location.reload(), 1000)
    } catch (err: unknown) {
      console.error('Enroll error:', err)
      setStatus('not-enrolled')
      if (axios.isAxiosError(err)) {
        if (err.response) {
          const status = err.response.status
          const body = err.response.data as ApiResponse<unknown>
          if (status === 403) {
            toast.error('Only students can enroll. Please login as a student.')
          } else if (status === 404) {
            toast.error('Course not found or not available')
          } else if (status === 422) {
            toast.error(body.message ?? 'Already enrolled')
          } else {
            toast.error(body.message ?? `Enrollment failed: ${status}`)
          }
        } else if (err.code === 'ECONNREFUSED' || err.code === 'ERR_NETWORK') {
          toast.error('Cannot connect to backend. Please start backend with: docker-compose up')
        } else {
          toast.error(`Connection error: ${err.message}`)
        }
      } else {
        toast.error('Failed to enroll')
      }
    }
  }

  if (status === 'loading') {
    return <Button disabled className="w-full sm:w-auto">Loading…</Button>
  }

  if (status === 'unauthenticated') {
    return (
      <Link href="/system/auth/login">
        <Button className="w-full sm:w-auto">Log in to enroll</Button>
      </Link>
    )
  }

  if (status === 'enrolled') {
    return (
      <a href={`#course-content`} className="w-full sm:w-auto">
        <Button variant="default" className="w-full sm:w-auto">Continue Learning</Button>
      </a>
    )
  }

  return (
    <Button
      onClick={handleEnroll}
      disabled={status === 'enrolling'}
      className="w-full sm:w-auto"
    >
      {status === 'enrolling' ? 'Enrolling…' : 'Enroll Now'}
    </Button>
  )
}
