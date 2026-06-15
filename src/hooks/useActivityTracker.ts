'use client'
import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''
const INTERVAL_MS = 60_000

function decodeSub(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.sub ?? ''
  } catch {
    return ''
  }
}

/**
 * Sends an activity heartbeat to the backend every 60s while the user is
 * logged in, so the Users page can show "Time in App" and "Last Active".
 */
export function useActivityTracker() {
  const { user, getIdToken } = useAuth()
  const lastBeatRef = useRef<number>(Date.now())

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const beat = async () => {
      if (cancelled) return
      try {
        const token = await getIdToken()
        const sub = decodeSub(token)
        const now = Date.now()
        const seconds = Math.round((now - lastBeatRef.current) / 1000)
        lastBeatRef.current = now
        await fetch(`${API_URL}/users/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: sub, seconds: Math.max(seconds, 1) }),
          keepalive: true,
        })
      } catch {
        // non-fatal
      }
    }

    // First beat shortly after mount, then on an interval
    lastBeatRef.current = Date.now()
    const initial = setTimeout(beat, 5_000)
    const interval = setInterval(beat, INTERVAL_MS)

    return () => {
      cancelled = true
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [user, getIdToken])
}
