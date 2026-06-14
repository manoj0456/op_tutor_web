
// ─── New types (OpTutor v3) ────────────────────────────────────
export type VideoProvider = 'YOUTUBE' | 'INTERNAL' | 'AWS' | 'VIMEO' | 'MUX'
export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
export type CourseStatus = 'DRAFT' | 'PUBLISHED'
export type SessionStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED'

export interface CourseVideo {
  videoId: string
  title: string
  description: string
  providerType: VideoProvider
  providerVideoId: string
  embedUrl: string
  youtubeUrl: string
  order: number
}

export interface Course {
  courseId: string
  title: string
  thumbnailUrl?: string
  shortDescription: string
  description: string
  category: string
  tags: string[]
  difficultyLevel: DifficultyLevel
  instructorName: string
  status: CourseStatus
  videos: CourseVideo[]
  createdBy: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
  publishedAt?: string
}

export interface LiveSession {
  sessionId: string
  title: string
  thumbnailUrl?: string
  shortDescription: string
  description: string
  instructorName: string
  scheduledAt: string
  duration: number
  timezone: string
  status: SessionStatus
  providerType: VideoProvider
  providerVideoId: string
  embedUrl: string
  youtubeUrl: string
  createdBy: string
  createdAt: string
  updatedBy?: string
  updatedAt?: string
}

// ─── Legacy types (OpTutor v2 — kept for DynamoDB backward compat) ─
export interface LegacyCourseVideo {
  videoId: string
  title: string
  youtubeUrl: string
  source?: 'youtube' | 'own-server'
}

export type OpCourseStatus = 'published' | 'draft'

export interface OpCourse {
  courseId: string
  title: string
  description: string
  category: string
  videos: LegacyCourseVideo[]
  status: OpCourseStatus
  createdBy: string
  createdAt: string
  updatedAt?: string
}

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
