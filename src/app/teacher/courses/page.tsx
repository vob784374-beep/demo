import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { fetchCourses } from '@/lib/api/courses'
import { COURSE_LEVELS } from '@/types/course'

export const revalidate = 300

export default async function TeacherCoursesPage() {
  const { courses } = await fetchCourses(1, 50)
  const myCourses = courses.filter(c => c.teacher_id === 1)

  return (
    <>
      <Header user={null} />
      <main className="container mx-auto max-w-6xl px-4 py-8 page-content">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 animate-fade-in-up">Course Management</h1>
            <p className="text-muted-foreground animate-fade-in-up delay-100">
              Create and manage your courses
            </p>
          </div>
          <Link href="/teacher/courses/new" className="animate-fade-in-up delay-200">
            <Button className="hover-lift">Create New Course</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myCourses.map((course, index) => (
            <div 
              key={course.id} 
              className="border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 bg-card group animate-fade-in-up"
              style={{ animationDelay: `${0.1 * (index + 2)}s` }}
            >
              <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-16 w-16 text-primary/30">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
                <span className="absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">
                  {course.is_published ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="p-5">
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full w-fit mb-2 block">
                  {course.category}
                </span>
                <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {course.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-sm text-muted-foreground">
                    {course.duration_hours ?? 0} hours
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {COURSE_LEVELS[course.level]}
                  </span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Link href={`/teacher/courses/${course.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">Edit</Button>
                  </Link>
                  <Link href={`/teacher/courses/${course.id}/lessons`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">Lessons</Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {myCourses.length === 0 && (
          <div className="text-center py-20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-16 w-16 text-muted-foreground mx-auto mb-4">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
            <p className="text-muted-foreground mb-4">You don't have any courses yet</p>
            <Link href="/teacher/courses/new">
              <Button>Create Your First Course</Button>
            </Link>
          </div>
        )}
      </main>
    </>
  )
}