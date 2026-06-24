'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import type { Course, LiveSession } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

const CATEGORIES = ['Programming', 'Design', 'Marketing', 'Business', 'Mathematics', 'Science', 'Technology', 'Arts', 'Other']
const TIMEZONES = ['America/New_York', 'America/Chicago', 'America/Los_Angeles', 'UTC', 'Europe/London', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney']
const DIFFICULTY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const

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

function isYouTubeUrl(url: string): boolean { return !!parseYouTubeUrl(url) }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiFetch(path: string, token: string, opts: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Shared components ──────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const input = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
const textarea = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"

function YouTubePreview({ url, small }: { url: string; small?: boolean }) {
  const parsed = parseYouTubeUrl(url)
  if (!parsed) return null
  return (
    <div className={`relative ${small ? 'aspect-video w-48' : 'aspect-video'} bg-black rounded-lg overflow-hidden mt-2`}>
      <iframe
        src={`${parsed.embedUrl}?rel=0`}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Preview"
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// COURSES TAB
// ════════════════════════════════════════════════════════════════

const THUMB_SIZES = ['maxresdefault', 'hqdefault', 'mqdefault', 'default'] as const

function extractVideoId(urlOrId: string): string {
  if (!urlOrId) return ''
  const parsed = parseYouTubeUrl(urlOrId)
  if (parsed) return parsed.providerVideoId
  return urlOrId.trim()
}

interface VideoRow { title: string; description: string; videoId: string; thumbVideoId: string; thumbSize: string }

function VideoRowInput({ row, index, total, onChange, onRemove, onMoveUp, onMoveDown }: {
  row: VideoRow; index: number; total: number
  onChange: (i: number, f: keyof VideoRow, v: string) => void
  onRemove: (i: number) => void
  onMoveUp: (i: number) => void
  onMoveDown: (i: number) => void
}) {
  const embedUrl = row.videoId ? `https://www.youtube.com/embed/${row.videoId}` : ''
  const thumbId = row.thumbVideoId || row.videoId
  const thumbUrl = thumbId ? `https://img.youtube.com/vi/${thumbId}/${row.thumbSize || 'hqdefault'}.jpg` : ''

  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500">Video {index + 1}</span>
        <div className="flex gap-1 items-center">
          <button disabled={index === 0} onClick={() => onMoveUp(index)} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1">↑</button>
          <button disabled={index === total - 1} onClick={() => onMoveDown(index)} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 px-1">↓</button>
          <button onClick={() => onRemove(index)} className="text-red-400 hover:text-red-600 px-1 ml-1">✕</button>
        </div>
      </div>
      <input className={input} placeholder="Video title *" value={row.title} onChange={e => onChange(index, 'title', e.target.value)} />
      <div>
        <label className="block text-xs text-gray-500 mb-1">YouTube Video ID *</label>
        <input
          className={`${input} ${row.videoId && !/^[\w-]{5,15}$/.test(row.videoId) ? 'border-red-400' : ''}`}
          placeholder="e.g. dQw4w9WgXcQ"
          value={row.videoId}
          onChange={e => {
            const id = extractVideoId(e.target.value)
            onChange(index, 'videoId', id)
            if (!row.thumbVideoId) onChange(index, 'thumbVideoId', id)
          }}
        />
        {embedUrl && <p className="text-xs text-gray-400 mt-1 truncate">{embedUrl}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Thumbnail Video ID</label>
          <input className={input} placeholder={row.videoId || 'Video ID'} value={row.thumbVideoId} onChange={e => onChange(index, 'thumbVideoId', extractVideoId(e.target.value))} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Thumbnail Size</label>
          <select className={input} value={row.thumbSize || 'hqdefault'} onChange={e => onChange(index, 'thumbSize', e.target.value)}>
            {THUMB_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {thumbUrl && (
        <div className="mt-1">
          <p className="text-xs text-gray-400 truncate mb-1">{thumbUrl}</p>
          <img src={thumbUrl} alt="Thumbnail preview" className="h-20 rounded-lg object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        </div>
      )}
      <input className={input} placeholder="Video description (optional)" value={row.description} onChange={e => onChange(index, 'description', e.target.value)} />
      {row.videoId && <YouTubePreview url={embedUrl} />}
    </div>
  )
}

function TagsInput({ value, onChange }: { value: string[]; onChange: (t: string[]) => void }) {
  const [input_val, setInputVal] = useState('')
  const add = () => {
    const t = input_val.trim()
    if (t && !value.includes(t)) onChange([...value, t])
    setInputVal('')
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map(t => (
          <span key={t} className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-2.5 py-1 rounded-full">
            {t}
            <button onClick={() => onChange(value.filter(x => x !== t))} className="text-primary-400 hover:text-primary-700">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={`${input} flex-1`}
          placeholder="Add tag and press Enter or comma"
          value={input_val}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
        />
        <button onClick={add} type="button" className="px-3 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Add</button>
      </div>
    </div>
  )
}

function CourseForm({ initial, onSave, onCancel, getToken }: {
  initial?: Course | null; onSave: (c: Course) => void; onCancel: () => void; getToken: () => Promise<string>
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fromInitial = (c: any): VideoRow[] => c?.videos?.length
    ? c.videos.map((v: any) => {
        const id = v.providerVideoId || extractVideoId(v.youtubeUrl || '')
        return { title: v.title || '', description: v.description || '', videoId: id, thumbVideoId: id, thumbSize: 'hqdefault' }
      })
    : [{ title: '', description: '', videoId: '', thumbVideoId: '', thumbSize: 'hqdefault' }]

  const [title, setTitle] = useState(initial?.title ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? '')
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Programming')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [difficultyLevel, setDifficultyLevel] = useState<Course['difficultyLevel']>(initial?.difficultyLevel ?? 'BEGINNER')
  const [instructorName, setInstructorName] = useState(initial?.instructorName ?? '')
  const [status, setStatus] = useState<Course['status']>(initial?.status ?? 'DRAFT')
  const [isPaid, setIsPaid] = useState<boolean>(initial?.isPaid ?? false)
  const [videos, setVideos] = useState<VideoRow[]>(fromInitial(initial))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateVideo = (i: number, field: keyof VideoRow, val: string) =>
    setVideos(prev => prev.map((v, idx) => idx === i ? { ...v, [field]: val } : v))

  const moveVideo = (i: number, dir: -1 | 1) => {
    const j = i + dir
    setVideos(prev => { const a = [...prev]; [a[i], a[j]] = [a[j], a[i]]; return a })
  }

  const handleSave = async (publish = false) => {
    if (!title.trim()) { setError('Title is required'); return }
    if (!instructorName.trim()) { setError('Instructor name is required'); return }
    const validVideos = videos.filter(v => v.videoId.trim())
    if (!validVideos.length) { setError('At least one YouTube Video ID is required'); return }
    setSaving(true); setError('')
    try {
      const token = await getToken()
      const method = initial ? 'PUT' : 'POST'
      const path = initial ? `/courses/${initial.courseId}` : '/courses'
      const thumbId = validVideos[0].thumbVideoId || validVideos[0].videoId
      const thumbSize = validVideos[0].thumbSize || 'hqdefault'
      const saved = await apiFetch(path, token, {
        method,
        body: JSON.stringify({
          title: title.trim(),
          thumbnailUrl: thumbnailUrl.trim() || `https://img.youtube.com/vi/${thumbId}/${thumbSize}.jpg`,
          shortDescription: shortDescription.trim(),
          description: description.trim(),
          category, tags, difficultyLevel,
          instructorName: instructorName.trim(),
          status: publish ? 'PUBLISHED' : status,
          isPaid,
          videos: validVideos.map((v, i) => {
            const embedUrl = `https://www.youtube.com/embed/${v.videoId}`
            const youtubeUrl = `https://www.youtube.com/watch?v=${v.videoId}`
            return { title: v.title.trim() || `Video ${i + 1}`, description: v.description.trim(), youtubeUrl, providerType: 'YOUTUBE', providerVideoId: v.videoId, embedUrl, order: i }
          }),
        }),
      })
      onSave(saved)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit sticky top-20">
      <h3 className="text-lg font-bold mb-5">{initial ? 'Edit Course' : 'New Course'}</h3>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <div className="space-y-4">
        <Field label="Course Title" required>
          <input className={input} placeholder="e.g. Introduction to Python" value={title} onChange={e => setTitle(e.target.value)} />
        </Field>

        <Field label="Thumbnail URL (auto-generated from first video, or override)">
          <input className={input} placeholder="Leave blank to auto-generate from video ID" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} />
          {thumbnailUrl && <img src={thumbnailUrl} alt="" className="mt-2 h-20 rounded-lg object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
        </Field>

        <Field label="Short Description">
          <textarea className={textarea} rows={2} maxLength={200} placeholder="One-line summary (max 200 chars)" value={shortDescription} onChange={e => setShortDescription(e.target.value)} />
          <p className="text-xs text-gray-400 text-right">{shortDescription.length}/200</p>
        </Field>

        <Field label="Detailed Description">
          <textarea className={textarea} rows={4} placeholder="Full description..." value={description} onChange={e => setDescription(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select className={input} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Difficulty">
            <select className={input} value={difficultyLevel} onChange={e => setDifficultyLevel(e.target.value as Course['difficultyLevel'])}>
              {DIFFICULTY_LEVELS.map(d => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Instructor Name" required>
            <input className={input} placeholder="Full name" value={instructorName} onChange={e => setInstructorName(e.target.value)} />
          </Field>
          <Field label="Status">
            <select className={input} value={status} onChange={e => setStatus(e.target.value as Course['status'])}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </Field>
        </div>

        <Field label="Access">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsPaid(false)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${!isPaid ? 'bg-green-100 text-green-700 ring-2 ring-green-300' : 'bg-gray-100 text-gray-500'}`}>Free</button>
            <button type="button" onClick={() => setIsPaid(true)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${isPaid ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' : 'bg-gray-100 text-gray-500'}`}>Paid</button>
          </div>
        </Field>

        <Field label="Tags">
          <TagsInput value={tags} onChange={setTags} />
        </Field>

        {/* Videos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Videos <span className="text-red-500">*</span></label>
            <button onClick={() => setVideos(p => [...p, { title: '', description: '', videoId: '', thumbVideoId: '', thumbSize: 'hqdefault' }])} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add video</button>
          </div>
          <div className="space-y-3">
            {videos.map((v, i) => (
              <VideoRowInput key={i} row={v} index={i} total={videos.length}
                onChange={updateVideo}
                onRemove={idx => setVideos(p => p.filter((_, j) => j !== idx))}
                onMoveUp={idx => moveVideo(idx, -1)}
                onMoveDown={idx => moveVideo(idx, 1)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg">Cancel</button>
        <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 bg-gray-100 text-gray-800 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-60">
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button onClick={() => handleSave(true)} disabled={saving} className="px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60">
          {saving ? 'Saving...' : 'Publish'}
        </button>
      </div>
    </div>
  )
}

function CoursesTab({ getToken }: { getToken: () => Promise<string> }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Course | null | undefined>(undefined) // undefined=hidden

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await apiFetch('/courses', token)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCourses(data.map((c: any) => ({ ...c, shortDescription: c.shortDescription || c.description || '', instructorName: c.instructorName || '', difficultyLevel: c.difficultyLevel || 'BEGINNER', tags: c.tags || [], isPaid: !!c.isPaid, status: (c.status || 'DRAFT').toUpperCase() })))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { load() }, [load])

  const handleSaved = (saved: Course) => {
    setCourses(prev => {
      const idx = prev.findIndex(c => c.courseId === saved.courseId)
      const norm = { ...saved, shortDescription: saved.shortDescription || '', instructorName: saved.instructorName || '', difficultyLevel: saved.difficultyLevel || 'BEGINNER', tags: saved.tags || [], isPaid: !!saved.isPaid, status: (saved.status || 'DRAFT').toUpperCase() as Course['status'] }
      return idx >= 0 ? prev.map(c => c.courseId === saved.courseId ? norm : c) : [norm, ...prev]
    })
    setEditing(undefined)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course?')) return
    try {
      const token = await getToken()
      await apiFetch(`/courses/${id}`, token, { method: 'DELETE' })
      setCourses(prev => prev.filter(c => c.courseId !== id))
      if (editing?.courseId === id) setEditing(undefined)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Delete failed') }
  }

  const statusBadge = (s: string) => {
    const up = s?.toUpperCase()
    return up === 'PUBLISHED'
      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Published</span>
      : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Draft</span>
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Left: list */}
      <div className="lg:col-span-2">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-gray-500">{courses.length} course{courses.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => setEditing(null)}
            className="px-4 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-full hover:bg-primary-700 transition"
          >
            + New Course
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border p-3 animate-pulse h-16" />)}</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm">No courses yet.</p>
            <button onClick={() => setEditing(null)} className="mt-2 text-primary-600 text-xs hover:underline">Create your first course</button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {courses.map(course => (
              <div
                key={course.courseId}
                className={`bg-white rounded-xl border p-3 cursor-pointer hover:shadow-sm transition ${editing?.courseId === course.courseId ? 'border-primary-400 ring-1 ring-primary-200' : 'border-gray-100'}`}
                onClick={() => setEditing(course)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{course.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {statusBadge(course.status)}
                      <span className="text-xs text-gray-400">{course.videos?.length ?? 0} videos</span>
                      <span className="text-xs text-gray-400">{formatDate(course.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(course.courseId) }}
                    className="text-red-400 hover:text-red-600 text-xs shrink-0 px-1.5 py-0.5 border border-red-200 rounded"
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: form */}
      <div className="lg:col-span-3">
        {editing !== undefined ? (
          <CourseForm
            initial={editing}
            onSave={handleSaved}
            onCancel={() => setEditing(undefined)}
            getToken={getToken}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-2xl">
            <div className="text-center">
              <div className="text-3xl mb-2">📝</div>
              <p className="text-sm">Select a course to edit or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// LIVE SESSIONS TAB
// ════════════════════════════════════════════════════════════════

function SessionForm({ initial, onSave, onCancel, getToken }: {
  initial?: LiveSession | null; onSave: (s: LiveSession) => void; onCancel: () => void; getToken: () => Promise<string>
}) {
  const now = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toLocal = (iso: string): { date: string; time: string } => {
    if (!iso) return { date: now.toISOString().split('T')[0], time: '09:00' }
    const d = new Date(iso)
    return { date: d.toISOString().split('T')[0], time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
  }
  const initDT = initial ? toLocal(initial.scheduledAt) : { date: now.toISOString().split('T')[0], time: '09:00' }

  const [title, setTitle] = useState(initial?.title ?? '')
  const [thumbnailUrl, setThumbnailUrl] = useState(initial?.thumbnailUrl ?? '')
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [instructorName, setInstructorName] = useState(initial?.instructorName ?? '')
  const [date, setDate] = useState(initDT.date)
  const [time, setTime] = useState(initDT.time)
  const [duration, setDuration] = useState(String(initial?.duration ?? 60))
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'UTC')
  const [status, setStatus] = useState<LiveSession['status']>(initial?.status ?? 'UPCOMING')
  const [isPaid, setIsPaid] = useState<boolean>(initial?.isPaid ?? false)
  const initVideoId = initial?.providerVideoId || extractVideoId(initial?.youtubeUrl ?? '')
  const [videoId, setVideoId] = useState(initVideoId)
  const [thumbVideoId, setThumbVideoId] = useState(initVideoId)
  const [thumbSize, setThumbSize] = useState<string>('hqdefault')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : ''
  const thumbId = thumbVideoId || videoId
  const thumbUrl = thumbId ? `https://img.youtube.com/vi/${thumbId}/${thumbSize}.jpg` : ''

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required'); return }
    if (!instructorName.trim()) { setError('Instructor name is required'); return }
    if (!videoId.trim()) { setError('YouTube Video ID is required'); return }
    setSaving(true); setError('')
    try {
      const token = await getToken()
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString()
      const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`
      const method = initial ? 'PUT' : 'POST'
      const path = initial ? `/live-sessions/${initial.sessionId}` : '/live-sessions'
      const saved = await apiFetch(path, token, {
        method,
        body: JSON.stringify({
          title: title.trim(),
          thumbnailUrl: thumbnailUrl.trim() || thumbUrl || undefined,
          shortDescription: shortDescription.trim(),
          description: description.trim(),
          instructorName: instructorName.trim(),
          scheduledAt, duration: Number(duration), timezone, status,
          isPaid,
          youtubeUrl,
          providerType: 'YOUTUBE',
          providerVideoId: videoId,
          embedUrl,
        }),
      })
      onSave(saved)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 h-fit sticky top-20">
      <h3 className="text-lg font-bold mb-5">{initial ? 'Edit Session' : 'New Live Session'}</h3>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

      <div className="space-y-4">
        <Field label="Session Title" required>
          <input className={input} placeholder="e.g. Live Q&A: Introduction to Python" value={title} onChange={e => setTitle(e.target.value)} />
        </Field>

        <Field label="YouTube Video ID" required>
          <input
            className={input}
            placeholder="e.g. dQw4w9WgXcQ"
            value={videoId}
            onChange={e => {
              const id = extractVideoId(e.target.value)
              setVideoId(id)
              if (!thumbVideoId) setThumbVideoId(id)
            }}
          />
          {embedUrl && <p className="text-xs text-gray-400 mt-1 truncate">{embedUrl}</p>}
          {videoId && <YouTubePreview url={embedUrl} />}
        </Field>

        <Field label="Thumbnail">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Video ID</label>
              <input className={input} placeholder={videoId || 'Video ID'} value={thumbVideoId} onChange={e => setThumbVideoId(extractVideoId(e.target.value))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Size</label>
              <select className={input} value={thumbSize} onChange={e => setThumbSize(e.target.value)}>
                {THUMB_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {thumbUrl && (
            <div className="mt-2">
              <p className="text-xs text-gray-400 truncate mb-1">{thumbUrl}</p>
              <img src={thumbUrl} alt="Thumbnail preview" className="h-20 rounded-lg object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
          )}
        </Field>

        <Field label="Thumbnail URL Override">
          <input className={input} placeholder="Leave blank to auto-generate" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} />
        </Field>

        <Field label="Short Description">
          <textarea className={textarea} rows={2} placeholder="One-line summary" value={shortDescription} onChange={e => setShortDescription(e.target.value)} />
        </Field>

        <Field label="Full Description">
          <textarea className={textarea} rows={3} placeholder="Details about this session..." value={description} onChange={e => setDescription(e.target.value)} />
        </Field>

        <Field label="Instructor Name" required>
          <input className={input} placeholder="Full name" value={instructorName} onChange={e => setInstructorName(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <input type="date" className={input} value={date} onChange={e => setDate(e.target.value)} />
          </Field>
          <Field label="Time">
            <input type="time" className={input} value={time} onChange={e => setTime(e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Duration (minutes)">
            <input type="number" min="15" className={input} value={duration} onChange={e => setDuration(e.target.value)} />
          </Field>
          <Field label="Timezone">
            <select className={input} value={timezone} onChange={e => setTimezone(e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Status">
          <select className={input} value={status} onChange={e => setStatus(e.target.value as LiveSession['status'])}>
            <option value="UPCOMING">Upcoming</option>
            <option value="LIVE">Live Now</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </Field>

        <Field label="Access">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setIsPaid(false)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${!isPaid ? 'bg-green-100 text-green-700 ring-2 ring-green-300' : 'bg-gray-100 text-gray-500'}`}>Free</button>
            <button type="button" onClick={() => setIsPaid(true)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${isPaid ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300' : 'bg-gray-100 text-gray-500'}`}>Paid</button>
          </div>
        </Field>
      </div>

      <div className="flex gap-2 mt-6 pt-4 border-t">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="flex-1 px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60">
          {saving ? 'Saving...' : initial ? 'Save Changes' : 'Schedule Session'}
        </button>
      </div>
    </div>
  )
}

function LiveSessionsTab({ getToken }: { getToken: () => Promise<string> }) {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<LiveSession | null | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const data = await apiFetch('/live-sessions', token)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setSessions(data.map((s: any) => {
        const statusMap: Record<string, LiveSession['status']> = { live: 'LIVE', upcoming: 'UPCOMING', ended: 'COMPLETED', completed: 'COMPLETED', cancelled: 'CANCELLED' }
        const rawStatus = (s.status || 'UPCOMING') as string
        const status: LiveSession['status'] = rawStatus.toUpperCase() in { LIVE: 1, UPCOMING: 1, COMPLETED: 1, CANCELLED: 1 }
          ? rawStatus.toUpperCase() as LiveSession['status']
          : (statusMap[rawStatus.toLowerCase()] ?? 'UPCOMING')
        return { ...s, status, instructorName: s.instructorName || s.hostName || '', shortDescription: s.shortDescription || '', timezone: s.timezone || 'UTC', isPaid: !!s.isPaid }
      }))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { load() }, [load])

  const handleSaved = (saved: LiveSession) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.sessionId === saved.sessionId)
      return idx >= 0 ? prev.map(s => s.sessionId === saved.sessionId ? saved : s) : [saved, ...prev]
    })
    setEditing(undefined)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return
    try {
      const token = await getToken()
      await apiFetch(`/live-sessions/${id}`, token, { method: 'DELETE' })
      setSessions(prev => prev.filter(s => s.sessionId !== id))
      if (editing?.sessionId === id) setEditing(undefined)
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Delete failed') }
  }

  const statusBadge = (s: LiveSession['status']) => {
    const styles: Record<string, string> = { LIVE: 'bg-red-100 text-red-600', UPCOMING: 'bg-blue-100 text-blue-600', COMPLETED: 'bg-gray-100 text-gray-500', CANCELLED: 'bg-orange-100 text-orange-600' }
    const labels: Record<string, string> = { LIVE: 'LIVE', UPCOMING: 'Upcoming', COMPLETED: 'Completed', CANCELLED: 'Cancelled' }
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[s] ?? ''}`}>{labels[s] ?? s}</span>
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      {/* Left: list */}
      <div className="lg:col-span-2">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm text-gray-500">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
          <button
            onClick={() => setEditing(null)}
            className="px-4 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-full hover:bg-primary-700 transition"
          >
            + New Session
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl border p-3 animate-pulse h-16" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p className="text-sm">No sessions yet.</p>
            <button onClick={() => setEditing(null)} className="mt-2 text-primary-600 text-xs hover:underline">Schedule your first session</button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
            {sessions.map(session => (
              <div
                key={session.sessionId}
                className={`bg-white rounded-xl border p-3 cursor-pointer hover:shadow-sm transition ${editing?.sessionId === session.sessionId ? 'border-primary-400 ring-1 ring-primary-200' : 'border-gray-100'}`}
                onClick={() => setEditing(session)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{session.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {statusBadge(session.status)}
                      <span className="text-xs text-gray-400">{formatDate(session.scheduledAt)}</span>
                      <span className="text-xs text-gray-400">{session.duration}m</span>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(session.sessionId) }}
                    className="text-red-400 hover:text-red-600 text-xs shrink-0 px-1.5 py-0.5 border border-red-200 rounded"
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: form */}
      <div className="lg:col-span-3">
        {editing !== undefined ? (
          <SessionForm
            initial={editing}
            onSave={handleSaved}
            onCancel={() => setEditing(undefined)}
            getToken={getToken}
          />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-2xl">
            <div className="text-center">
              <div className="text-3xl mb-2">🎥</div>
              <p className="text-sm">Select a session to edit or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════
export default function ContentManagementPage() {
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
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500">You need the manage_courses permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Content Management</h1>
        <p className="text-gray-500 mt-1">Create and manage courses and live sessions for all students.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
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
