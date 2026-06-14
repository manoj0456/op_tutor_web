'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import type { Course, CourseVideo } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

// ── YouTube helpers ────────────────────────────────────────────
function parseYouTubeUrl(url: string): { providerVideoId: string; embedUrl: string } | null {
  if (!url) return null
  const patterns = [
    /youtube\.com\/watch\?v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return { providerVideoId: m[1], embedUrl: `https://www.youtube.com/embed/${m[1]}` }
  }
  return null
}

function getVideoThumbnail(video: CourseVideo): string {
  if (video.providerVideoId) return `https://img.youtube.com/vi/${video.providerVideoId}/hqdefault.jpg`
  const parsed = parseYouTubeUrl(video.youtubeUrl)
  if (parsed) return `https://img.youtube.com/vi/${parsed.providerVideoId}/hqdefault.jpg`
  return ''
}

function getVideoEmbedUrl(video: CourseVideo): string {
  if (video.embedUrl) return video.embedUrl
  const parsed = parseYouTubeUrl(video.youtubeUrl)
  return parsed ? parsed.embedUrl : ''
}

// Normalize data from API (handles both old and new field shapes)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeCourse(c: any): Course {
  const videos: CourseVideo[] = (c.videos || []).map((v: any, i: number) => {
    const ytUrl = v.youtubeUrl || ''
    const parsed = parseYouTubeUrl(ytUrl)
    return {
      videoId: v.videoId || String(i),
      title: v.title || `Video ${i + 1}`,
      description: v.description || '',
      providerType: v.providerType || 'YOUTUBE',
      providerVideoId: v.providerVideoId || parsed?.providerVideoId || '',
      embedUrl: v.embedUrl || parsed?.embedUrl || '',
      youtubeUrl: ytUrl,
      order: v.order ?? i,
    }
  })
  return {
    ...c,
    shortDescription: c.shortDescription || c.description || '',
    description: c.description || '',
    instructorName: c.instructorName || '',
    difficultyLevel: c.difficultyLevel || 'BEGINNER',
    tags: Array.isArray(c.tags) ? c.tags : [],
    status: (c.status || 'PUBLISHED').toUpperCase() as Course['status'],
    videos,
  }
}

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-700',
  ADVANCED: 'bg-red-100 text-red-700',
}

// ── Course card ────────────────────────────────────────────────
function CourseCard({ course, onClick }: { course: Course; onClick: () => void }) {
  const firstVideo = course.videos[0]
  const thumb = course.thumbnailUrl || (firstVideo ? getVideoThumbnail(firstVideo) : '')

  return (
    <button
      onClick={onClick}
      className="group text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden w-full"
    >
      <div className="relative aspect-video bg-gray-100">
        {thumb ? (
          <img src={thumb} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📚</div>
        )}
        {course.status === 'DRAFT' && (
          <span className="absolute top-2 right-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Draft</span>
        )}
        <span className="absolute top-2 left-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">{course.category}</span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 line-clamp-2 text-sm mb-1">{course.title}</h3>
        {course.shortDescription && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">{course.shortDescription}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          {course.instructorName && (
            <span className="text-xs text-gray-500 truncate max-w-[60%]">{course.instructorName}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[course.difficultyLevel] ?? 'bg-gray-100 text-gray-600'}`}>
            {course.difficultyLevel.charAt(0) + course.difficultyLevel.slice(1).toLowerCase()}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{course.videos.length} video{course.videos.length !== 1 ? 's' : ''}</p>
      </div>
    </button>
  )
}

// ── Course detail view ─────────────────────────────────────────
function CourseDetail({ course, onBack }: { course: Course; onBack: () => void }) {
  const [activeVideo, setActiveVideo] = useState<CourseVideo>(course.videos[0])
  const embedUrl = getVideoEmbedUrl(activeVideo) + '?autoplay=0&rel=0'

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-6 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
      >
        ← Back to Courses
      </button>

      {/* Course header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">{course.category}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[course.difficultyLevel] ?? ''}`}>
            {course.difficultyLevel.charAt(0) + course.difficultyLevel.slice(1).toLowerCase()}
          </span>
          {course.tags.map(t => (
            <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        {course.instructorName && (
          <p className="text-sm text-gray-500 mt-1">Instructor: <span className="font-medium text-gray-700">{course.instructorName}</span></p>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Video player */}
        <div className="lg:col-span-2">
          {embedUrl && activeVideo.providerVideoId ? (
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-lg">
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={activeVideo.title}
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
              No valid video URL
            </div>
          )}
          <div className="mt-4">
            <h2 className="text-lg font-bold text-gray-900">{activeVideo.title}</h2>
            {activeVideo.description && (
              <p className="text-sm text-gray-600 mt-1">{activeVideo.description}</p>
            )}
          </div>
          {/* Course description */}
          {course.description && (
            <div className="mt-6 p-5 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">About this course</h3>
              <div className="text-sm text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: course.description }} />
            </div>
          )}
        </div>

        {/* Playlist sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-20">
            <div className="p-4 border-b">
              <p className="text-sm font-semibold text-gray-700">{course.videos.length} Videos</p>
            </div>
            <div className="divide-y max-h-[60vh] overflow-y-auto">
              {course.videos.map((v, i) => {
                const thumb = getVideoThumbnail(v)
                const isActive = activeVideo.videoId === v.videoId
                return (
                  <button
                    key={v.videoId}
                    onClick={() => setActiveVideo(v)}
                    className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition ${isActive ? 'bg-primary-50' : ''}`}
                  >
                    <div className="relative w-16 h-10 rounded overflow-hidden shrink-0 bg-gray-200">
                      {thumb && <img src={thumb} alt="" className="w-full h-full object-cover" />}
                      {isActive && (
                        <div className="absolute inset-0 bg-primary-600/70 flex items-center justify-center">
                          <span className="text-white text-sm">▶</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs font-medium leading-tight line-clamp-2 ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>
                        {i + 1}. {v.title}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function CoursesPage() {
  const { user, getIdToken } = useAuth()
  const { loaded } = usePermissions()

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')

  const loadCourses = useCallback(async () => {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (user) {
        const token = await getIdToken()
        headers['Authorization'] = `Bearer ${token}`
      }
      const res = await fetch(`${API_URL}/courses`, { headers })
      if (res.ok) {
        const data = await res.json()
        setCourses(data.map(normalizeCourse))
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [user, getIdToken])

  useEffect(() => { if (loaded) loadCourses() }, [loaded, loadCourses])

  const allCategories = ['All', ...Array.from(new Set(courses.map(c => c.category))).sort()]

  const filtered = courses.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !search
      || c.title.toLowerCase().includes(q)
      || c.instructorName.toLowerCase().includes(q)
      || c.category.toLowerCase().includes(q)
      || c.shortDescription.toLowerCase().includes(q)
    const matchCat = filterCat === 'All' || c.category === filterCat
    return matchSearch && matchCat
  })

  if (selectedCourse) {
    return (
      <div className="container mx-auto px-4 py-8">
        <CourseDetail course={selectedCourse} onBack={() => setSelectedCourse(null)} />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
        <p className="text-gray-500 mt-1">Expand your skills with expert-led content</p>
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Search by title, instructor, category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-72"
        />
        <div className="flex gap-2 flex-wrap">
          {allCategories.map(c => (
            <button
              key={c}
              onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${filterCat === c ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-t-xl" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">📚</div>
          <p className="font-medium">{courses.length === 0 ? 'No courses yet' : 'No courses match your search'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(course => (
            <CourseCard key={course.courseId} course={course} onClick={() => setSelectedCourse(course)} />
          ))}
        </div>
      )}
    </div>
  )
}
