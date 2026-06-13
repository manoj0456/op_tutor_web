'use client'
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from './AuthContext'

interface UserRoleData {
  email: string
  roleId: string
  roleName: string
  permissions: string[]
}

interface PermissionContextValue {
  userRole: UserRoleData | null
  permissions: Set<string>
  hasPermission: (name: string) => boolean
  isSuperAdmin: boolean
  isTeacher: boolean
  loaded: boolean
  refresh: () => void
}

const PermissionContext = createContext<PermissionContextValue | null>(null)

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user, userEmail, getIdToken } = useAuth()
  const [userRole, setUserRole] = useState<UserRoleData | null>(null)
  const [loaded, setLoaded]     = useState(false)

  const getIdTokenRef = useRef(getIdToken)
  getIdTokenRef.current = getIdToken

  const loadPermissions = useCallback(async () => {
    if (!user || !userEmail) {
      setUserRole(null)
      setLoaded(true)
      return
    }
    try {
      const token = await getIdTokenRef.current()
      const res   = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to fetch role')
      const data: UserRoleData = await res.json()
      setUserRole(data)
    } catch {
      setUserRole({ email: userEmail, roleId: 'STUDENT', roleName: 'Student', permissions: ['view_content'] })
    } finally {
      setLoaded(true)
    }
  }, [user, userEmail])

  useEffect(() => {
    setLoaded(false)
    loadPermissions()
  }, [loadPermissions])

  const permissions   = useMemo(
    () => new Set(Array.isArray(userRole?.permissions) ? userRole!.permissions : []),
    [userRole],
  )
  const hasPermission = useCallback((name: string) => permissions.has(name), [permissions])
  const isSuperAdmin  = userRole?.roleId === 'SUPER_ADMIN'
  const isTeacher     = userRole?.roleId === 'TEACHER' || isSuperAdmin

  const value = useMemo(() => ({
    userRole, permissions, hasPermission,
    isSuperAdmin, isTeacher, loaded,
    refresh: loadPermissions,
  }), [userRole, permissions, hasPermission, isSuperAdmin, isTeacher, loaded, loadPermissions])

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export function usePermissions() {
  const ctx = useContext(PermissionContext)
  if (!ctx) throw new Error('usePermissions must be used inside PermissionProvider')
  return ctx
}