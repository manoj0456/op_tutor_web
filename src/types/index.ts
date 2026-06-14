

// ─── Courses (OpTutor v2 — multi-video) ──────────────────────
export interface CourseVideo {
  videoId: string
  title: string
  youtubeUrl: string
  /** Future-proof: swap 'youtube' for 'own-server' without changing UI */
  source: 'youtube' | 'own-server'
}

export type OpCourseStatus = 'published' | 'draft'

export interface OpCourse {
  courseId: string
  title: string
  description: string
  category: string
  videos: CourseVideo[]
  status: OpCourseStatus
  createdBy: string
  createdAt: string
  updatedAt?: string
}

// ─── Live Sessions (OpTutor v2) ────────────────────────────────
export type OpSessionStatus = 'upcoming' | 'live' | 'ended'

export interface OpLiveSession {
  sessionId: string
  title: string
  description: string
  youtubeUrl: string
  scheduledAt: string
  duration: number
  hostName: string
  status: OpSessionStatus
  createdBy: string
  createdAt: string
}
