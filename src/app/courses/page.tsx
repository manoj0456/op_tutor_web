'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import type { OpCourse, CourseVideo } from '@/types'
import { PermissionGate } from '@/components/shared/PermissionGate'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

const CATEGORIES = ['Mathematics','Science','Technology','Physics','Biology','Arts','Sports','Coding','English','History','Other']

// ── YouTube helpers ────────────────────────────────────────────
function extractVideoId(url: string): string | null {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}
function getThumbnail(url: string): string {
  const id = extractVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '/placeholder-course.jpg'
}
function getEmbedUrl(url: string): string | null {
  const id = extractVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null
}

// ── Video form row ─────────────────────────────────────────────
interface VideoRow { title: string; youtubeUrl: string }

function VideoRowInput({ row, index, onChange, onRemove, canRemove }: {
  row: VideoRow; index: number; onChange: (i: number, f: keyof VideoRow, v: string) => void
  onRemove: (i: number) => void; canRemove: boolean
}) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 grid grid-cols-2 gap-2">
        <input
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={`Video ${index + 1} title`}
          value={row.title}
          onChange={e => onChange(index, 'title', e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="YouTube URL"
          value={row.youtubeUrl}
          onChange={e => onChange(index, 'youtubeUrl', e.target.value)}
        />
      </div>
      {canRemove && (
        <button onClick={() => onRemove(index)} className="mt-1 text-red-400 hover:text-red-600 text-lg">✕</button>
      )}
    </div>
  )
}

// ── Add/Edit course modal ─────────────────────────────────────
interface CourseModalProps {
  initial?: OpCourse | null
  onClose: () => void
  onSave: (course: OpCourse) => void
  getToken: () => Promise<string>
}

function CourseModal({ initial, onClose, onSave, getToken }: CourseModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Other')
  const [status, setStatus] = useState<'published' | 'draft'>(initial?.status ?? 'published')
  const [videos, setVideos] = useState<VideoRow[]>(
    initial?.videos?.length ? initial.videos.map(v => ({ title: v.title, youtubeUrl: v.youtubeUrl })) : [{ title: '', youtubeUrl: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateVideo = (i: number, field: keyof VideoRow, val: string) => {
    setVideos(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v))
  }
  const addVideo = () => setVideos(prev => [...prev, { title: '', youtubeUrl: '' }])
  const removeVideo = (i: number) => setVideos(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    const validVideos = videos.filter(v => v.youtubeUrl.trim())
    if (validVideos.length === 0) { setError('At least one video with a YouTube URL is required'); return }
    setSaving(true); setError('')
    try {
      const token = await getToken()
      const method = initial ? 'PUT' : 'POST'
      const url = initial ? `${API_URL}/courses/${initial.courseId}` : `${API_URL}/courses`
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), category, status, videos: validVideos }),
      })
      if (!res.ok) throw new Error(await res.text())
      const saved: OpCourse = await res.json()
      onSave(saved)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">{initial ? 'Edit Course' : 'Add New Course'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Title *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Introduction to Algebra"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={3}
                placeholder="Brief description of the course..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={status}
                  onChange={e => setStatus(e.target.value as 'published' | 'draft')}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Videos *</label>
                <button onClick={addVideo} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add video</button>
              </div>
              <div className="space-y-2">
                {videos.map((v, i) => (
                  <VideoRowInput key={i} row={v} index={i} onChange={updateVideo} onRemove={removeVideo} canRemove={videos.length > 1} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Paste YouTube video URLs (e.g. https://www.youtube.com/watch?v=xxxxx)</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full hover:bg-primary-700 disabled:opacity-60 transition"
            >
              {saving ? 'Saving...' : initial ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Course detail view ─────────────────────────────────────────
function CourseDetail({ course, onBack, canManage, onEdit, onDelete, getToken }: {
  course: OpCourse; onBack: () => void; canManage: boolean
  onEdit: (c: OpCourse) => void; onDelete: (id: string) => void; getToken: () => Promise<string>
}) {
  const [activeVideo, setActiveVideo] = useState<CourseVideo>(course.videos[0])
  const embedUrl = getEmbedUrl(activeVideo.youtubeUrl)

  const handleDelete = async () => {
    if (!confirm('Delete this course?')) return
    try {
      const token = await getToken()
      await fetch(`${API_URL}/courses/${course.courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      onDelete(course.courseId)
    } catch {
      alert('Failed to delete course')
    }
  }

  return (
    <div>
      <button onClick={onBack} className="mb-6 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
        ← Back to Courses
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Video player */}
        <div className="lg:col-span-2">
          {embedUrl ? (
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
              Invalid YouTube URL
            </div>
          )}
          <div className="mt-4">
            <h2 className="text-xl font-bold text-gray-900">{activeVideo.title}</h2>
          </div>
        </div>

        {/* Course sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Course info */}
            <div className="p-5 border-b">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{course.title}</h1>
                  <span className="inline-block mt-1 text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                    {course.category}
                  </span>
                </div>
                {canManage && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onEdit(course)} className="text-xs text-gray-500 hover:text-primary-600 px-2 py-1 rounded border">Edit</button>
                    <button onClick={handleDelete} className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded border">Del</button>
                  </div>
                )}
              </div>
              {course.description && <p className="mt-2 text-sm text-gray-500 leading-relaxed">{course.description}</p>}
              <p className="mt-2 text-xs text-gray-400">{course.videos.length} video{course.videos.length !== 1 ? 's' : ''}</p>
            </div>

            {/* Video list */}
            <div className="divide-y">
              {course.videos.map((v, i) => (
                <button
                  key={v.videoId}
                  onClick={() => setActiveVideo(v)}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition ${activeVideo.videoId === v.videoId ? 'bg-primary-50' : ''}`}
                >
                  <div className="relative w-16 h-10 rounded overflow-hidden shrink-0 bg-gray-200">
                    <img src={getThumbnail(v.youtubeUrl)} alt="" className="w-full h-full object-cover" />
                    {activeVideo.videoId === v.videoId && (
                      <div className="absolute inset-0 bg-primary-600/70 flex items-center justify-center">
                        <span className="text-white text-lg">▶</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium leading-tight line-clamp-2 ${activeVideo.videoId === v.videoId ? 'text-primary-700' : 'text-gray-900'}`}>
                      {i + 1}. {v.title}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Course card ────────────────────────────────────────────────
function CourseCard({ course, onClick }: { course: OpCourse; onClick: () => void }) {
  const thumb = course.videos[0] ? getThumbnail(course.videos[0].youtubeUrl) : ''
  return (
    <button onClick={onClick} className="group text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden">
      <div className="relative aspect-video bg-gray-100">
        {thumb && <img src={thumb} alt={course.title} className="w-full h-full object-cover" />}
        {course.status === 'draft' && (
          <span className="absolute top-2 right-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Draft</span>
        )}
        <span className="absolute top-2 left-2 text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">{course.category}</span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 line-clamp-2 text-sm">{course.title}</h3>
        {course.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{course.description}</p>}
        <p className="text-xs text-gray-400 mt-2">{course.videos.length} video{course.videos.length !== 1 ? 's' : ''}</p>
      </div>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function CoursesPage() {
  const { user, getIdToken } = useAuth()
  const { hasPermission, loaded } = usePermissions()
  const canManage = hasPermission('manage_courses')

  const [courses, setCourses] = useState<OpCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<OpCourse | null>(null)
  const [modalCourse, setModalCourse] = useState<OpCourse | null | undefined>(undefined) // undefined=closed, null=new
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
      if (res.ok) setCourses(await res.json())
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false)
    }
  }, [user, getIdToken])

  useEffect(() => { if (loaded) loadCourses() }, [loaded, loadCourses])

  const handleSaved = (saved: OpCourse) => {
    setCourses(prev => {
      const idx = prev.findIndex(c => c.courseId === saved.courseId)
      return idx >= 0 ? prev.map(c => c.courseId === saved.courseId ? saved : c) : [saved, ...prev]
    })
    setModalCourse(undefined)
  }

  const handleDeleted = (id: string) => {
    setCourses(prev => prev.filter(c => c.courseId !== id))
    setSelectedCourse(null)
  }

  const filtered = courses.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'All' || c.category === filterCat
    return matchSearch && matchCat
  })

  const allCategories = ['All', ...Array.from(new Set(courses.map(c => c.category))).sort()]

  if (selectedCourse) {
    return (
      <div className="container mx-auto px-4 py-8">
        <CourseDetail
          course={selectedCourse}
          onBack={() => setSelectedCourse(null)}
          canManage={canManage}
          onEdit={(c) => setModalCourse(c)}
          onDelete={handleDeleted}
          getToken={getIdToken}
        />
        {modalCourse !== undefined && (
          <CourseModal
            initial={modalCourse}
            onClose={() => setModalCourse(undefined)}
            onSave={(saved) => { handleSaved(saved); setSelectedCourse(saved) }}
            getToken={getIdToken}
          />
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-500 mt-1">Expand your skills with expert-led content</p>
        </div>
        <PermissionGate permission="manage_courses">
          <button
            onClick={() => setModalCourse(null)}
            className="px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-full hover:bg-primary-700 transition shadow-sm"
          >
            + Add Course
          </button>
        </PermissionGate>
      </div>

      {/* Search & filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Search courses..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl animate-pulse">
              <div className="aspect-video bg-gray-200 rounded-t-xl" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">📚</div>
          <p className="font-medium">{courses.length === 0 ? 'No courses yet' : 'No courses match your search'}</p>
          {canManage && courses.length === 0 && (
            <button onClick={() => setModalCourse(null)} className="mt-4 text-primary-600 text-sm hover:underline">
              Add your first course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(course => (
            <CourseCard key={course.courseId} course={course} onClick={() => setSelectedCourse(course)} />
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modalCourse !== undefined && (
        <CourseModal
          initial={modalCourse}
          onClose={() => setModalCourse(undefined)}
          onSave={handleSaved}
          getToken={getIdToken}
        />
      )}
    </div>
  )
}
