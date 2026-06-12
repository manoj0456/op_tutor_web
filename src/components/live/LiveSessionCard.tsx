import type { LiveSession } from '@/types'
import { format } from 'date-fns'
import Link from 'next/link'

interface Props { session: LiveSession }

export function LiveSessionCard({ session }: Props) {
  const isLive = session.status === 'live'
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4 hover:shadow-md transition">
      <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900">{session.title}</h3>
          {isLive && <span className="shrink-0 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">LIVE</span>}
        </div>
        <p className="text-sm text-gray-500 mt-1">by {session.teacher.name}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
          <span>{format(new Date(session.scheduledAt), 'MMM d, h:mm a')}</span>
          <span>·</span>
          <span>{session.duration}m</span>
          <span>·</span>
          <span>{session.enrolledStudents}/{session.maxStudents} students</span>
        </div>
        {session.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {session.topics.map(t => <span key={t} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full">{t}</span>)}
          </div>
        )}
      </div>
      <Link href={`/live/${session.id}`} className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${isLive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary-600 text-white hover:bg-primary-700'}`}>
        {isLive ? 'Join Now' : 'Register'}
      </Link>
    </div>
  )
}
