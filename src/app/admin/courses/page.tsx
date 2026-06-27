'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import type { OpCourse, OpLiveSession } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
const CATEGORIES = ['Mathematics','Science','Technology','Physics','Biology','Arts','Sports','Coding','English','History','Other']

// ── YouTube helpers ────────────────────────────────────────────
function extractVideoId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}
function getThumbnail(url: string): string {
  const id = extractVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : ''
}
function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Shared api fetch ──────────────────────────────────────────
async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// ════════════════════════════════════════════════════════════════
// COURSES TAB
// ════════════════════════════════════════════════════════════════

interface VideoRow { title: string; youtubeUrl: string }

function CourseForm({ initial, onSave, onCancel, getToken }: {
  initial?: OpCourse | null; onSave: (c: OpCourse) => void; onCancel: () => void; getToken: () => Promise<string>
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Mathematics')
  const [status, setStatus] = useState<'published' | 'draft'>(initial?.status ?? 'published')
  const [videos, setVideos] = useState<VideoRow[]>(
    initial?.videos?.length ? initial.videos.map(v => ({ title: v.title, youtubeUrl: v.youtubeUrl })) : [{ title: '', youtubeUrl: '' }]
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateVideo = (i: number, field: keyof VideoRow, val: string) =>
    setVideos(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v))

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    const validVideos = videos.filter(v => v.youtubeUrl.trim())
    if (!validVideos.length) { setError('At least one video with a YouTube URL is required'); return }
    setSaving(true); setError('')
    try {
      const token = await getToken()
      const method = initial ? 'PUT' : 'POST'
      const path = initial ? `/courses/${initial.courseId}` : '/courses'
      const saved = await apiFetch(path, token, { method, body: JSON.stringify({ title: title.trim(), description: description.trim(), category, status, videos: validVideos }) })
      onSave(saved)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-lg font-bold mb-4">{initial ? 'Edit Course' : 'Add New Course'}</h3>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Title *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Introduction to Algebra" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={status} onChange={e => setStatus(e.target.value as 'published' | 'draft')}>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Videos *</label>
            <button onClick={() => setVideos(p => [...p, { title: '', youtubeUrl: '' }])} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add video</button>
          </div>
          <div className="space-y-2">
            {videos.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder={`Video ${i+1} title`} value={v.title} onChange={e => updateVideo(i, 'title', e.target.value)} />
                <input className="flex-[2] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="YouTube URL" value={v.youtubeUrl} onChange={e => updateVideo(i, 'youtubeUrl', e.target.value)} />
                {videos.length > 1 && <button onClick={() => setVideos(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-lg shrink-0">x</button>}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Paste YouTube URLs (e.g. https://www.youtube.com/watch?v=xxxxx)</p>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full hover:bg-primary-700 disabled:opacity-60 transition">
          {saving ? 'Saving...' : initial ? 'Save Changes' : 'Create Course'}
        </button>
      </div>
    </div>
  )
}

function CoursesTab({ getToken }: { getToken: () => Promise<string> }) {
  const [courses, setCourses] = useState<OpCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<OpCourse | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await apiFetch('/courses', token)
      setCourses(data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { load() }, [load])

  const handleSaved = (saved: OpCourse) => {
    setCourses(prev => {
      const idx = prev.findIndex(c => c.courseId === saved.courseId)
      return idx >= 0 ? prev.map(c => c.courseId === saved.courseId ? saved : c) : [saved, ...prev]
    })
    setShowForm(false); setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course?')) return
    try {
      const token = await getToken()
      await apiFetch(`/courses/${id}`, token, { method: 'DELETE' })
      setCourses(prev => prev.filter(c => c.courseId !== id))
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Delete failed') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{courses.length} course{courses.length !== 1 ? 's' : ''} total</p>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full hover:bg-primary-700 transition">+ Add Course</button>
        )}
      </div>

      {(showForm || editing) && (
        <div className="mb-6">
          <CourseForm
            initial={editing}
            onSave={handleSaved}
            onCancel={() => { setShowForm(false); setEditing(null) }}
            getToken={getToken}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border p-4 animate-pulse h-20" />)}</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">courses</div>
          <p>No courses yet.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-primary-600 text-sm hover:underline">Create your first course</button>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(course => {
            const thumb = course.videos[0] ? getThumbnail(course.videos[0].youtubeUrl) : ''
            return (
              <div key={course.courseId} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition">
                {thumb && <img src={thumb} alt="" className="w-16 h-10 max-w-full rounded-lg object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900 text-sm truncate">{course.title}</h4>
                    {course.status === 'draft' && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full shrink-0">Draft</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>{course.category}</span>
                    <span>{course.videos.length} video{course.videos.length !== 1 ? 's' : ''}</span>
                    <span>Added {formatDate(course.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditing(course); setShowForm(false) }} className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                  <button onClick={() => handleDelete(course.courseId)} className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// LIVE SESSIONS TAB
// ════════════════════════════════════════════════════════════════

function SessionForm({ initial, onSave, onCancel, getToken }: {
  initial?: OpLiveSession | null; onSave: (s: OpLiveSession) => void; onCancel: () => void; getToken: () => Promise<string>
}) {
  const now = new Date()
  const toLocal = (iso: string) => {
    if (!iso) return { date: now.toISOString().split('T')[0], time: '09:00' }
    const d = new Date(iso)
    return { date: d.toISOString().split('T')[0], time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
  }
  const initDT = initial ? toLocal(initial.scheduledAt) : { date: now.toISOString().split('T')[0], time: '09:00' }

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? '')
  const [date, setDate] = useState(initDT.date)
  const [time, setTime] = useState(initDT.time)
  const [duration, setDuration] = useState(String(initial?.duration ?? 60))
  const [hostName, setHostName] = useState(initial?.hostName ?? '')
  const [status, setStatus] = useState<OpLiveSession['status']>(initial?.status ?? 'upcoming')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    if (!youtubeUrl.trim()) { setError('YouTube URL is required'); return }
    setSaving(true); setError('')
    try {
      const token = await getToken()
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
      const method = initial ? 'PUT' : 'POST'
      const path = initial ? `/live-sessions/${initial.sessionId}` : '/live-sessions'
      const saved = await apiFetch(path, token, { method, body: JSON.stringify({ title: title.trim(), description: description.trim(), youtubeUrl: youtubeUrl.trim(), scheduledAt, duration: Number(duration), hostName: hostName.trim(), status }) })
      onSave(saved)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-lg font-bold mb-4">{initial ? 'Edit Session' : 'Schedule Live Session'}</h3>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Live Algebra Q&A" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="What will be covered..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Live URL *</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Host Name</label>
          <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={hostName} onChange={e => setHostName(e.target.value)} placeholder="Teacher / host name" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
            <input type="number" min="15" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={status} onChange={e => setStatus(e.target.value as OpLiveSession['status'])}>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live Now</option>
            <option value="ended">Ended</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full hover:bg-primary-700 disabled:opacity-60 transition">
          {saving ? 'Saving...' : initial ? 'Save Changes' : 'Schedule Session'}
        </button>
      </div>
    </div>
  )
}

function LiveSessionsTab({ getToken }: { getToken: () => Promise<string> }) {
  const [sessions, setSessions] = useState<OpLiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<OpLiveSession | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      setSessions(await apiFetch('/live-sessions', token))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { load() }, [load])

  const handleSaved = (saved: OpLiveSession) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.sessionId === saved.sessionId)
      return idx >= 0 ? prev.map(s => s.sessionId === saved.sessionId ? saved : s) : [saved, ...prev]
    })
    setShowForm(false); setEditing(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return
    try {
      const token = await getToken()
      await apiFetch(`/live-sessions/${id}`, token, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.sessionId !== id))
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Delete failed') }
  }

  const statusStyles: Record<string, string> = {
    live: 'bg-red-100 text-red-600', upcoming: 'bg-blue-100 text-blue-600', ended: 'bg-gray-100 text-gray-500',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{sessions.length} session{sessions.length !== 1 ? 's' : ''} total</p>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)} className="px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full hover:bg-primary-700 transition">+ Schedule Session</button>
        )}
      </div>

      {(showForm || editing) && (
        <div className="mb-6">
          <SessionForm initial={editing} onSave={handleSaved} onCancel={() => { setShowForm(false); setEditing(null) }} getToken={getToken} />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border p-4 animate-pulse h-16" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No sessions yet.</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-primary-600 text-sm hover:underline">Schedule your first session</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <div key={session.sessionId} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition">
              <div className={`w-3 h-3 rounded-full shrink-0 ${session.status === 'live' ? 'bg-red-500 animate-pulse' : session.status === 'upcoming' ? 'bg-blue-400' : 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">{session.title}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusStyles[session.status] ?? ''}`}>{session.status}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                  <span>Host: {session.hostName}</span>
                  <span>{formatDate(session.scheduledAt)}</span>
                  <span>{session.duration}m</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setEditing(session); setShowForm(false) }} className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
                <button onClick={() => handleDelete(session.sessionId)} className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function AdminCoursesPage() {
  const { getIdToken } = useAuth()
  const { hasPermission, loaded } = usePermissions()
  const router = useRouter()
  const [tab, setTab] = useState<'courses' | 'live'>('courses')

  useEffect(() => {
    if (loaded && !hasPermission('manage_courses')) {
      router.replace('/courses')
    }
  }, [loaded, hasPermission, router])

  if (!loaded) {
    return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>
  }

  if (!hasPermission('manage_courses')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl mb-4">locked</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500">You need the manage_courses permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-500 mt-1">Manage courses and live sessions for all students.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('courses')}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition ${tab === 'courses' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Courses
        </button>
        <button
          onClick={() => setTab('live')}
          className={`px-6 py-2.5 rounded-full text-sm font-semibold transition ${tab === 'live' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
        >
          Live Sessions
        </button>
      </div>

      {tab === 'courses' ? <CoursesTab getToken={getIdToken} /> : <LiveSessionsTab getToken={getIdToken} />}
    </div>
  )
}
