import { CourseCardSkeleton } from '@/components/catalog/CourseCardSkeleton'

export default function CoursesLoading() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-10">
      <div className="h-9 w-48 rounded bg-muted animate-pulse mb-8" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <CourseCardSkeleton key={i} />
        ))}
      </div>
    </main>
  )
}
