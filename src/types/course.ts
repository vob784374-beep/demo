export interface Course {
  id: number
  teacher_id: number
  title: string
  description: string | null
  category: CourseCategory | null
  thumbnail: string | null
  is_published: boolean
  level: CourseLevel
  duration_hours: number | null
  price: number
  created_at: string
  updated_at: string
}

export interface CourseDetail extends Course {
  lesson_count: number
  teacher_name: string | null
  is_enrolled: boolean | null
}

export const COURSE_CATEGORIES = [
  'Pronunciation Course',
  'Vocabulary to Speak',
  'Grammar to Speak',
  'Essential Writing',
  'IELTS Writing',
  'IELTS Speaking',
] as const

export type CourseCategory = typeof COURSE_CATEGORIES[number]

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels'

export const COURSE_LEVELS: Record<CourseLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  all_levels: 'All Levels',
}
