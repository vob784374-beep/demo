'use client'

import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EnrollButton } from './EnrollButton'
import { useAuthStore } from '@/lib/stores/authStore'
import type { Course } from '@/types/course'

interface CourseCardProps {
  course: Course
}

export function CourseCard({ course }: CourseCardProps) {
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  
  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
      {/* Thumbnail placeholder */}
      {course.thumbnail ? (
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          <img 
            src={course.thumbnail} 
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          {course.category && (
            <Badge 
              variant="secondary" 
              className="absolute left-3 top-3 shadow-sm"
            >
              {course.category}
            </Badge>
          )}
        </div>
      ) : (
        <div className="relative h-40 w-full bg-gradient-to-br from-primary/10 to-secondary/10">
          {course.category && (
            <Badge 
              variant="secondary" 
              className="absolute left-3 top-3 shadow-sm"
            >
              {course.category}
            </Badge>
          )}
          <div className="flex h-full items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 text-primary/30">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
        </div>
      )}

      <CardHeader className="flex-grow">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug font-semibold line-clamp-2">
            {course.title}
          </CardTitle>
        </div>
      </CardHeader>

      {course.description && (
        <CardContent className="flex-1 pb-0">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        </CardContent>
      )}

      <CardFooter className="flex items-center gap-2 pt-4">
        {hasHydrated && user ? (
          <EnrollButton courseId={course.id} />
        ) : (
          <Link href="/system/auth/login" className="flex-1">
            <Button 
              variant="default" 
              size="sm" 
              className="w-full font-semibold"
            >
              Log in to enroll
            </Button>
          </Link>
        )}
        <Button variant="outline" size="sm" className="shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Button>
      </CardFooter>
    </Card>
  )
}
