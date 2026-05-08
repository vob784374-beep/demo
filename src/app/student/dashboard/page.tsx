import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/Header'
import { fetchCourses } from '@/lib/api/courses'
import { COURSE_LEVELS } from '@/types/course'

export default async function StudentDashboard() {
  const { courses } = await fetchCourses(1, 6)
  const enrolledCourses = courses.slice(0, 3)

  const progressData = [
    { course: 'English Pronunciation Master', progress: 75, lessons: 15, total: 20 },
    { course: 'Vocabulary to Speak', progress: 45, lessons: 45, total: 100 },
    { course: 'IELTS Writing', progress: 20, lessons: 8, total: 40 },
  ]

  return (
    <>
      <Header user={null} />
      <main className="container mx-auto max-w-6xl px-4 py-8 page-content">
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome!</h1>
          <p className="text-muted-foreground">Continue your English learning journey</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in-up delay-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-primary">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enrolled Courses</p>
                <p className="text-2xl font-bold">{enrolledCourses.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in-up delay-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-green-600">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lessons Completed</p>
                <p className="text-2xl font-bold">68</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in-up delay-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6 text-blue-600">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hours Learned</p>
                <p className="text-2xl font-bold">24.5</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold animate-fade-in-up">Learning Progress</h2>
          </div>
          <div className="space-y-4">
            {progressData.map((item, index) => (
              <div 
                key={item.course} 
                className="bg-card border border-border rounded-xl p-4 animate-fade-in-up"
                style={{ animationDelay: `${0.1 * (index + 4)}s` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{item.course}</span>
                  <span className="text-sm text-muted-foreground">{item.lessons}/{item.total} lessons</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{item.progress}% complete</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold animate-fade-in-up">Recommended Courses</h2>
            <Link href="/student/courses" className="text-primary hover:underline text-sm">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.slice(0, 3).map((course, index) => (
              <Link 
                key={course.id} 
                href={`/student/courses/${course.id}`}
                className="animate-fade-in-up"
                style={{ animationDelay: `${0.1 * (index + 7)}s` }}
              >
                <div className="border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover-lift bg-card group h-full flex flex-col">
                  <div className="aspect-video bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-12 w-12 text-primary/30">
                      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    </svg>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full w-fit mb-2">
                      {course.category}
                    </span>
                    <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground text-xs flex-1">
                      {course.description}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground pt-3 border-t">
                      <span>{course.duration_hours ?? 0} hours</span>
                      <span>{COURSE_LEVELS[course.level]}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}