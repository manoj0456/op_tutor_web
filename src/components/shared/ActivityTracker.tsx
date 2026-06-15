'use client'
import { useActivityTracker } from '@/hooks/useActivityTracker'

/** Invisible component that drives the activity heartbeat. Mounted in the root layout. */
export function ActivityTracker() {
  useActivityTracker()
  return null
}
