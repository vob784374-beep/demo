export const queryKeys = {
  courses: () => ['courses'] as const,
  course: (id: number) => ['courses', id] as const,
  courseLessons: (courseId: number) => ['courses', courseId, 'lessons'] as const,
  userProgress: (userId: number) => ['users', userId, 'progress'] as const,
  myProgress: () => ['progress', 'me'] as const,
} as const
