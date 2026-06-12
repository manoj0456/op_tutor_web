// ─── User & Auth ──────────────────────────────────────────────
export type UserRole = 'student' | 'teacher' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  createdAt: string
}

// ─── Courses ──────────────────────────────────────────────────
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced'
export type CourseStatus = 'draft' | 'published' | 'archived'
export type CourseCategory =
  | 'technology' | 'math' | 'science' | 'physics'
  | 'biology' | 'arts' | 'sports' | 'ai' | 'other'

export interface Course {
  id: string
  title: string
  description: string
  thumbnail?: string
  teacherId: string
  teacher: User
  category: CourseCategory
  level: CourseLevel
  status: CourseStatus
  price: number
  isFree: boolean
  totalDuration: number   // minutes
  totalLessons: number
  enrolledCount: number
  rating: number
  curriculum: Module[]
  createdAt: string
  updatedAt: string
}

export interface Module {
  id: string
  courseId: string
  title: string
  order: number
  lessons: Lesson[]
}

export interface Lesson {
  id: string
  moduleId: string
  title: string
  type: 'video' | 'quiz' | 'article' | 'exercise'
  duration: number   // minutes
  videoUrl?: string
  content?: string
  order: number
  isPreview: boolean
}

// ─── Live Sessions ────────────────────────────────────────────
export type LiveSessionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'

export interface LiveSession {
  id: string
  title: string
  description?: string
  teacherId: string
  teacher: User
  courseId?: string
  scheduledAt: string
  duration: number    // minutes
  status: LiveSessionStatus
  maxStudents: number
  enrolledStudents: number
  recordingUrl?: string
  roomId: string
  topics: string[]
}

// ─── Enrollment & Progress ────────────────────────────────────
export interface Enrollment {
  id: string
  userId: string
  courseId: string
  enrolledAt: string
  progress: number    // 0–100
  completedLessons: string[]
  lastAccessedAt: string
}

// ─── Quiz & Exercises ─────────────────────────────────────────
export interface Quiz {
  id: string
  lessonId: string
  questions: Question[]
}

export interface Question {
  id: string
  text: string
  options: string[]
  correctIndex: number
  explanation?: string
}

// ─── API Responses ────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
