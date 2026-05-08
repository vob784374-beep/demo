export interface Lesson {
  id: number
  course_id: number
  title: string
  description: string | null
  order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface LessonDetail extends Lesson {
  exercise_count: number
  duration_minutes: number | null
}

export interface Exercise {
  id: number
  lesson_id: number
  title: string
  type: ExerciseType
  content: Record<string, unknown>
  order: number
  points: number
  created_at: string
  updated_at: string
}

export type ExerciseType = 
  | 'multiple_choice'
  | 'fill_in_blank'
  | 'matching'
  | 'speaking'
  | 'writing'
  | 'listening'
  | 'reading'

export interface Assessment {
  id: number
  course_id: number
  title: string
  description: string | null
  type: AssessmentType
  passing_score: number
  time_limit_minutes: number | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export type AssessmentType = 
  | 'quiz'
  | 'midterm'
  | 'final'
  | 'speaking_test'
  | 'writing_test'

export interface AssessmentResult {
  id: number
  assessment_id: number
  user_id: number
  score: number
  total_points: number
  passed: boolean
  completed_at: string
  answers: Record<string, unknown>
}

export interface CourseProgress {
  course_id: number
  user_id: number
  completed_lessons: number
  total_lessons: number
  completed_exercises: number
  total_exercises: number
  progress_percentage: number
  last_accessed_at: string
}

export interface UserAnswer {
  exercise_id: number
  user_id: number
  answer: Record<string, unknown>
  is_correct: boolean | null
  score: number | null
  submitted_at: string
}