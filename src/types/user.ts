export type UserRole = 'student' | 'teacher' | 'admin'

export interface User {
  id: number
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  createdAt: string
}
