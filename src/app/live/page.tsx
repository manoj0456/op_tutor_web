'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import type { LiveSession, SessionStatus } from '@/types'

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

function getSessionThumbnail(s: LiveSession): string {
  if (s.thumbnailUrl) return s.thumbnailUrl
  if (s.providerVideoId) return `https://img.youtube.com/vi/${s.providerVideoId}/hqdefault.jpg`
  const parsed = parseYouTubeUrl(s.youtubeUrl)
  if (parsed) return `https://img.youtube.com/vi/${parsed.providerVideoId}/hqdefault.jpg`
  return ''
}

function getSessionEmbedUrl(s: LiveSession, autoplay = false): string {
  const base = s.embedUrl || (parseYouTubeUrl(s.youtubeUrl)?.embedUrl ?? '')
  return base ? `${base}?rel=0${autoplay ? '&autoplay=1' : ''}` : ''
}

// Normalize data from API (handles both old and new field shapes)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeSession(s: any): LiveSession {
  const ytUrl = s.youtubeUrl || ''
  const parsed = parseYouTubeUrl(ytUrl)
  // Map old lowercase statuses to new uppercase
  const statusMap: Record<string, SessionStatus> = {
    live: 'LIVE', upcoming: 'UPCOMING', ended: 'COMPLETED', completed: 'COMPLETED', cancelled: 'CANCELLED',
  }
  const rawStatus = (s.status || 'UPCOMING') as string
  const status: SessionStatus = rawStatus.toUpperCase() in { LIVE: 1, UPCOMING: 1, COMPLETED: 1, CANCELLED: 1 }
    ? (rawStatus.toUpperCase() as SessionStatus)
    : (statusMap[rawStatus.toLowerCase()] ?? 'UPCOMING')

  return {
    ...s,
    status,
    shortDescription: s.shortDescription || s.description || '',
    description: s.description || '',
    instructorName: s.instructorName || s.hostName || '',
    timezone: s.timezone || 'UTC',
    providerType: s.providerType || 'YOUTUBE',
    providerVideoId: s.providerVideoId || parsed?.providerVideoId || '',
    embedUrl: s.embedUrl || parsed?.embedUrl || '',
    youtubeUrl: ytUrl,
    isPaid: !!s.isPaid,
  }
}

function formatDateTime(iso: string, timezone: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: timezone,
    }) + ` (${timezone})`
  } catch {
    return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  }
}

function formatDateShort(iso: string, timezone: string) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: timezone,
    })
  } catch {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
  }
}

// ── Countdown hook ─────────────────────────────────────────────
function useCountdown(targetIso: string) {
  const [display, setDisplay] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const update = () => {
      const diff = new Date(targetIso).getTime() - Date.now()
      if (diff <= 0) { setDisplay('Starting soon'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDisplay(`${d > 0 ? `${d}d ` : ''}${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    update()
    timerRef.current = setInterval(update, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [targetIso])

  return display
}

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }: { status: SessionStatus }) {
  const styles: Record<SessionStatus, string> = {
    LIVE: 'bg-red-100 text-red-600',
    UPCOMING: 'bg-blue-100 text-blue-600',
    COMPLETED: 'bg-gray-100 text-gray-500',
    CANCELLED: 'bg-orange-100 text-orange-600',
  }
  const labels: Record<SessionStatus, string> = {
    LIVE: '● LIVE', UPCOMING: 'Upcoming', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

// ── Countdown display ──────────────────────────────────────────
function CountdownTimer({ scheduledAt }: { scheduledAt: string }) {
  const display = useCountdown(scheduledAt)
  return (
    <div className="mt-2 flex items-center gap-1.5 text-primary-600">
      <span className="text-xs font-medium">Starts in:</span>
      <span className="text-sm font-bold tabular-nums">{display}</span>
    </div>
  )
}

// ── Session card ───────────────────────────────────────────────
function SessionCard({ session, onClick }: { session: LiveSession; onClick: () => void }) {
  const thumb = getSessionThumbnail(session)
  const isLive = session.status === 'LIVE'
  const isUpcoming = session.status === 'UPCOMING'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl border shadow-sm hover:shadow-md transition overflow-hidden group ${isLive ? 'border-red-200' : 'border-gray-100'}`}
    >
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="relative w-24 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-200">
          {thumb ? (
            <img src={thumb} alt={session.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🎥</div>
          )}
          {isLive && (
            <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition text-sm line-clamp-2">
              {session.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${session.isPaid ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>{session.isPaid ? 'PAID' : 'FREE'}</span>
              <StatusBadge status={session.status} />
            </div>
          </div>
          {session.instructorName && (
            <p className="text-xs text-gray-500">Instructor: {session.instructorName}</p>
          )}
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span>{formatDateShort(session.scheduledAt, session.timezone)}</span>
            <span>·</span>
            <span>{session.duration}m</span>
          </div>
          {session.shortDescription && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{session.shortDescription}</p>
          )}
          {isUpcoming && <CountdownTimer scheduledAt={session.scheduledAt} />}
        </div>
      </div>
    </button>
  )
}

// ── Session detail view ────────────────────────────────────────
function SessionDetail({ session, onBack }: { session: LiveSession; onBack: () => void }) {
  const isLive = session.status === 'LIVE'
  const isUpcoming = session.status === 'UPCOMING'
  const embedUrl = getSessionEmbedUrl(session, isLive)

  return (
    <div>
      <button onClick={onBack} className="mb-6 text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
        ← Back to Live Sessions
      </button>

      <div className="max-w-3xl mx-auto">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={session.status} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{session.title}</h1>
          {session.instructorName && (
            <p className="text-sm text-gray-500 mt-1">Instructor: <span className="font-medium text-gray-700">{session.instructorName}</span></p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
            <span>{formatDateTime(session.scheduledAt, session.timezone)}</span>
            <span>{session.duration} minutes</span>
          </div>
          {isUpcoming && (
            <div className="mt-3 inline-block bg-primary-50 rounded-xl px-4 py-2">
              <CountdownTimer scheduledAt={session.scheduledAt} />
            </div>
          )}
        </div>

        {/* Video embed */}
        {(isLive || isUpcoming) && embedUrl ? (
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-lg mb-6">
            <iframe
              src={embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={session.title}
            />
          </div>
        ) : session.status === 'COMPLETED' ? (
          <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center mb-6 text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">🎬</div>
              <p className="text-sm">This session has ended</p>
            </div>
          </div>
        ) : session.status === 'CANCELLED' ? (
          <div className="aspect-video bg-orange-50 rounded-2xl flex items-center justify-center mb-6 text-orange-400">
            <div className="text-center">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-sm">This session was cancelled</p>
            </div>
          </div>
        ) : null}

        {session.description && (
          <div className="p-5 bg-gray-50 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-2">About this session</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{session.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Section component ──────────────────────────────────────────
function Section({ title, sessions, onSelect, emptyMsg }: {
  title: React.ReactNode; sessions: LiveSession[]; onSelect: (s: LiveSession) => void; emptyMsg: string
}) {
  if (sessions.length === 0) return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <p className="text-sm text-gray-400 italic">{emptyMsg}</p>
    </div>
  )
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-3">
        {sessions.map(s => <SessionCard key={s.sessionId} session={s} onClick={() => onSelect(s)} />)}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function LivePage() {
  const { getIdToken } = useAuth()
  const { loaded } = usePermissions()

  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<LiveSession | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getIdToken().catch(() => null)
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`${API_URL}/live-sessions`, { headers })
      if (res.ok) {
        const data = await res.json()
        setSessions(data.map(normalizeSession))
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [getIdToken])

  useEffect(() => { if (loaded) loadSessions() }, [loaded, loadSessions])

  const liveSessions = sessions.filter(s => s.status === 'LIVE')
  const upcoming = sessions.filter(s => s.status === 'UPCOMING').sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  )
  const past = sessions.filter(s => s.status === 'COMPLETED' || s.status === 'CANCELLED').sort(
    (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
  )

  if (selected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <SessionDetail session={selected} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Live Sessions</h1>
        <p className="text-gray-500 mt-1">Join real-time sessions with expert instructors</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl border p-4 animate-pulse flex gap-4">
              <div className="w-24 h-16 rounded-lg bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">🎥</div>
          <p className="font-medium">No live sessions scheduled yet</p>
        </div>
      ) : (
        <>
          {/* Live Now */}
          {liveSessions.length > 0 && (
            <div className="mb-10">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
                Live Now
              </h2>
              <div className="space-y-3">
                {liveSessions.map(s => <SessionCard key={s.sessionId} session={s} onClick={() => setSelected(s)} />)}
              </div>
            </div>
          )}

          <Section
            title="Upcoming Sessions"
            sessions={upcoming}
            onSelect={setSelected}
            emptyMsg="No upcoming sessions scheduled."
          />

          <Section
            title="Past Sessions"
            sessions={past}
            onSelect={setSelected}
            emptyMsg="No past sessions yet."
          />
        </>
      )}
    </div>
  )
}
