'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import type { OpLiveSession } from '@/types'
import { PermissionGate } from '@/components/shared/PermissionGate'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

function getLiveEmbedUrl(url: string): string | null {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|live\/)([A-Za-z0-9_-]{11})/)
  if (m) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`
  if (url.includes('youtube.com/embed/')) return url
  return null
}

function formatDate(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}
function formatTime(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    live: 'bg-red-100 text-red-600',
    upcoming: 'bg-blue-100 text-blue-600',
    ended: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${styles[status] ?? styles.upcoming}`}>
      {status === 'live' ? '● LIVE' : status}
    </span>
  )
}

function SessionDetailModal({ session, onClose, canManage, onDelete, onEdit, getToken }: {
  session: OpLiveSession; onClose: () => void; canManage: boolean
  onDelete: (id: string) => void; onEdit: (s: OpLiveSession) => void; getToken: () => Promise<string>
}) {
  const embedUrl = getLiveEmbedUrl(session.youtubeUrl)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this session?')) return
    setDeleting(true)
    try {
      const token = await getToken()
      await fetch(`${API_URL}/live-sessions/${session.sessionId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      onDelete(session.sessionId)
    } catch { alert('Failed to delete session') }
    finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="mb-1"><StatusBadge status={session.status} /></div>
              <h2 className="text-xl font-bold text-gray-900">{session.title}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0">x</button>
          </div>

          {(session.status === 'live' || session.status === 'upcoming') && embedUrl ? (
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-5 shadow">
              <iframe src={embedUrl} className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen title={session.title} />
            </div>
          ) : session.status === 'ended' ? (
            <div className="aspect-video bg-gray-100 rounded-xl flex items-center justify-center mb-5 text-gray-400">
              <div className="text-center"><div className="text-4xl mb-2">recording</div><p className="text-sm">This session has ended</p></div>
            </div>
          ) : null}

          <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
            <div><span className="text-gray-400">Host: </span>{session.hostName}</div>
            <div><span className="text-gray-400">Date: </span>{formatDate(session.scheduledAt)} at {formatTime(session.scheduledAt)}</div>
            <div><span className="text-gray-400">Duration: </span>{session.duration} minutes</div>
          </div>

          {session.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-5 bg-gray-50 rounded-xl p-4">{session.description}</p>
          )}

          {canManage && (
            <div className="flex gap-2 pt-4 border-t">
              <button onClick={() => { onClose(); onEdit(session) }} className="px-4 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50">Edit</button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SessionFormModal({ initial, onClose, onSave, getToken }: {
  initial?: OpLiveSession | null; onClose: () => void
  onSave: (s: OpLiveSession) => void; getToken: () => Promise<string>
}) {
  const now = new Date()
  const defaultDate = now.toISOString().split('T')[0]
  const toLocal = (iso: string) => {
    if (!iso) return { date: defaultDate, time: '09:00' }
    const d = new Date(iso)
    return { date: d.toISOString().split('T')[0], time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
  }
  const initDT = initial ? toLocal(initial.scheduledAt) : { date: defaultDate, time: '09:00' }

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
      const url = initial ? `${API_URL}/live-sessions/${initial.sessionId}` : `${API_URL}/live-sessions`
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), youtubeUrl: youtubeUrl.trim(), scheduledAt, duration: Number(duration), hostName: hostName.trim(), status }),
      })
      if (!res.ok) throw new Error(await res.text())
      onSave(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">{initial ? 'Edit Session' : 'Schedule Live Session'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">x</button>
          </div>
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
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={hostName} onChange={e => setHostName(e.target.value)} placeholder="Teacher name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                <input type="number" min="15" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={duration} onChange={e => setDuration(e.target.value)} />
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
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-full hover:bg-primary-700 disabled:opacity-60 transition">
              {saving ? 'Saving...' : initial ? 'Save Changes' : 'Schedule Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SessionCard({ session, onClick }: { session: OpLiveSession; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition group">
      <div className="flex items-start gap-4">
        <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${session.status === 'live' ? 'bg-red-500 animate-pulse' : session.status === 'upcoming' ? 'bg-blue-400' : 'bg-gray-300'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition text-sm">{session.title}</h3>
            <StatusBadge status={session.status} />
          </div>
          <p className="text-xs text-gray-500 mt-1">Host: {session.hostName}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            <span>{formatDate(session.scheduledAt)} at {formatTime(session.scheduledAt)}</span>
            <span>{session.duration}m</span>
          </div>
          {session.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{session.description}</p>}
        </div>
      </div>
    </button>
  )
}

export default function LivePage() {
  const { user, getIdToken } = useAuth()
  const { hasPermission, loaded } = usePermissions()
  const canManage = hasPermission('manage_courses')

  const [sessions, setSessions] = useState<OpLiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<OpLiveSession | null>(null)
  const [formSession, setFormSession] = useState<OpLiveSession | null | undefined>(undefined)
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'live' | 'ended'>('all')

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const headers: Record<string, string> = {}
      if (user) { const token = await getIdToken(); headers['Authorization'] = `Bearer ${token}` }
      const res = await fetch(`${API_URL}/live-sessions`, { headers })
      if (res.ok) setSessions(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [user, getIdToken])

  useEffect(() => { if (loaded) loadSessions() }, [loaded, loadSessions])

  const handleSaved = (saved: OpLiveSession) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.sessionId === saved.sessionId)
      return idx >= 0 ? prev.map(s => s.sessionId === saved.sessionId ? saved : s) : [saved, ...prev]
    })
    setFormSession(undefined)
  }

  const handleDeleted = (id: string) => { setSessions(prev => prev.filter(s => s.sessionId !== id)); setSelected(null) }

  const filtered = filterStatus === 'all' ? sessions : sessions.filter(s => s.status === filterStatus)
  const liveCount = sessions.filter(s => s.status === 'live').length

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Classes</h1>
          <p className="text-gray-500 mt-1">Join real-time sessions with expert teachers</p>
        </div>
        <PermissionGate permission="manage_courses">
          <button onClick={() => setFormSession(null)} className="px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-full hover:bg-primary-700 transition shadow-sm">
            + Schedule Session
          </button>
        </PermissionGate>
      </div>

      {liveCount > 0 && (
        <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
          <p className="text-sm font-medium text-red-700">{liveCount} session{liveCount > 1 ? 's' : ''} happening now!</p>
          <button onClick={() => setFilterStatus('live')} className="ml-auto text-xs text-red-600 font-semibold underline">View live</button>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {(['all', 'live', 'upcoming', 'ended'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition ${filterStatus === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl border p-5 animate-pulse">
              <div className="flex gap-4"><div className="w-3 h-3 rounded-full bg-gray-200 mt-1.5"/><div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-2/3"/><div className="h-3 bg-gray-200 rounded w-1/3"/></div></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">live</div>
          <p className="font-medium">{sessions.length === 0 ? 'No sessions scheduled yet' : 'No sessions in this category'}</p>
          <PermissionGate permission="manage_courses">
            {sessions.length === 0 && <button onClick={() => setFormSession(null)} className="mt-4 text-primary-600 text-sm hover:underline">Schedule your first session</button>}
          </PermissionGate>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(session => <SessionCard key={session.sessionId} session={session} onClick={() => setSelected(session)} />)}
        </div>
      )}

      {selected && (
        <SessionDetailModal session={selected} onClose={() => setSelected(null)} canManage={canManage}
          onDelete={handleDeleted} onEdit={s => { setSelected(null); setFormSession(s) }} getToken={getIdToken} />
      )}
      {formSession !== undefined && (
        <SessionFormModal initial={formSession} onClose={() => setFormSession(undefined)} onSave={handleSaved} getToken={getIdToken} />
      )}
    </div>
  )
}
