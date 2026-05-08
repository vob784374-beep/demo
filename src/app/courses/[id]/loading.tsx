import { Skeleton } from '@/components/ui/skeleton'

export default function CourseDetailLoading() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Skeleton className="h-8 w-24 mb-4" />
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-6 w-20 mt-1" />
      </div>
      <Skeleton className="h-4 w-32 mb-1" />
      <Skeleton className="h-4 w-24 mb-6" />
      <div className="space-y-2 mb-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
      <Skeleton className="h-10 w-36" />
    </main>
  )
}
