'use client'
import { useQuery } from '@tanstack/react-query'
import { LiveSessionCard } from './LiveSessionCard'
import type { LiveSession } from '@/types'

async function fetchLiveSessions(): Promise<LiveSession[]> {
  return []
}

export function LiveSessionList() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: fetchLiveSessions,
  })
  if (isLoading) return <div className="space-y-4">{Array.from({length:3}).map((_,i) => <div key={i} className="bg-gray-100 rounded-xl h-28 animate-pulse" />)}</div>
  if (!sessions.length) return <p className="text-gray-400">No upcoming sessions. Check back soon!</p>
  return (
    <div className="space-y-4">
      {sessions.map(s => <LiveSessionCard key={s.id} session={s} />)}
    </div>
  )
}
