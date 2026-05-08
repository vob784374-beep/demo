import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { fetchCourses } from '@/lib/api/courses'
import { COURSE_CATEGORIES, COURSE_LEVELS, type CourseCategory } from '@/types/course'

export const revalidate = 300

interface StudentCoursesPageProps {
  searchParams: Promise<{ page?: string; category?: string }>
}

export default async function StudentCoursesPage({ searchParams }: StudentCoursesPageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const category = params.category as CourseCategory | undefined

  const { courses, meta } = await fetchCourses(page, 12, category)
  const totalPages = Math.ceil(meta.total / meta.per_page)

  const categoryLabels: Record<CourseCategory, string> = {
    'Pronunciation Course': 'Pronunciation',
    'Vocabulary to Speak': 'Conversational Vocabulary',
    'Grammar to Speak': 'Conversational Grammar',
    'Essential Writing': 'Essential Writing',
    'IELTS Writing': 'IELTS Writing',
    'IELTS Speaking': 'IELTS Speaking',
  }

  return (
    <>
      <Header user={null} />
      <main className="container mx-auto max-w-6xl px-4 py-8 page-content">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up">Your Courses</h1>
          <p className="text-muted-foreground animate-fade-in-up delay-100">
            Choose a course to start your English learning journey
          </p>
        </div>

        <div className="mb-8 animate-fade-in-up delay-200">
          <div className="flex flex-wrap gap-2">
            <Link href="/student/courses">
              <Button 
                variant={!category ? 'default' : 'outline'} 
                size="sm"
                className="hover-lift"
              >
                All
              </Button>
            </Link>
            {COURSE_CATEGORIES.map((cat) => (
              <Link key={cat} href={`/student/courses?category=${encodeURIComponent(cat)}`}>
                <Button 
                  variant={category === cat ? 'default' : 'outline'} 
                  size="sm"
                  className="hover-lift"
                >
                  {categoryLabels[cat]}
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No courses available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, index) => (
              <Link 
                key={course.id} 
                href={`/student/courses/${course.id}`}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.1 * (index + 3)}s` }}
              >
                <div className="border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover-lift bg-card group h-full flex flex-col">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-16 w-16 text-primary/30">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full w-fit mb-2">
                      {course.category}
                    </span>
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
                      {course.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        {course.duration_hours ?? 0} hours
                      </span>
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                          <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        {COURSE_LEVELS[course.level]}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="Pagination" className="flex justify-center items-center gap-2 mt-8">
            {page > 1 && (
              <Link href={`/student/courses?page=${page - 1}${category ? `&category=${encodeURIComponent(category)}` : ''}`}>
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
            )}
            <span className="text-sm text-muted-foreground px-2">
              Page {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link href={`/student/courses?page=${page + 1}${category ? `&category=${encodeURIComponent(category)}` : ''}`}>
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            )}
          </nav>
        )}
      </main>
    </>
  )
}