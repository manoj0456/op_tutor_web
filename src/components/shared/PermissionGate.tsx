'use client'
import { usePermissions } from '@/context/PermissionContext'

interface Props {
  permission?: string
  requireSuperAdmin?: boolean
  requireTeacher?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({ permission, requireSuperAdmin, requireTeacher, fallback = null, children }: Props) {
  const { hasPermission, isSuperAdmin, isTeacher, loaded } = usePermissions()

  if (!loaded) return null

  if (requireSuperAdmin && !isSuperAdmin) return <>{fallback}</>
  if (requireTeacher    && !isTeacher)    return <>{fallback}</>
  if (permission && !hasPermission(permission)) return <>{fallback}</>

  return <>{children}</>
}