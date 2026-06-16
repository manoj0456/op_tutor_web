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

// Hardcoded defaults per Cognito group when no custom role found
function getDefaultPermissions(groupId: string): string[] {
  const ALL = [
    'view_courses','view_live','manage_courses','manage_roles',
    'manage_employees','manage_students','promote_admins','view_content',
  ]
  switch (groupId.toUpperCase()) {
    case 'SUPER_ADMIN': return ALL
    case 'ADMIN':       return ['view_courses','view_live','manage_courses','manage_roles','manage_employees','manage_students','promote_admins']
    case 'TEACHER':     return ['view_courses','view_live','manage_courses']
    default:            return ['view_content','view_courses','view_live']
  }
}

// Safely decode a JWT payload (base64url → JSON)
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[1]
    const padded = part.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded.padEnd(padded.length + (4 - (padded.length % 4)) % 4, '='))
    return JSON.parse(json)
  } catch {
    return {}
  }
}

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

      // 1. Decode JWT to get Cognito group
      const payload = decodeJwtPayload(token)
      const cognitoGroups = (payload['cognito:groups'] as string[] | undefined) ?? []
      const primaryGroup  = cognitoGroups[0] ?? 'STUDENT'

      // 2. Fetch /users/me for the assigned roleId (may differ from Cognito group)
      let roleId   = primaryGroup
      let roleName = primaryGroup
      try {
        const meRes = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (meRes.ok) {
          const me = await meRes.json()
          if (me?.roleId) { roleId   = me.roleId   }
          if (me?.roleName) { roleName = me.roleName }
        }
      } catch { /* fall through to group-based defaults */ }

      // 3. Fetch all custom roles
      let customRoles: Array<{ roleId: string; name: string; permissions: string[] }> = []
      try {
        const rolesRes = await fetch(`${API_URL}/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (rolesRes.ok) customRoles = await rolesRes.json()
      } catch { /* ignore */ }

      // 4. Match Cognito group name → custom role (case-insensitive on role.name)
      const matchedRole = customRoles.find(
        r => r.name.toLowerCase() === primaryGroup.toLowerCase()
      )

      // 5. Determine final permissions
      let permissions: string[]
      if (matchedRole && Array.isArray(matchedRole.permissions) && matchedRole.permissions.length > 0) {
        permissions = matchedRole.permissions
      } else {
        permissions = getDefaultPermissions(roleId)
      }

      setUserRole({ email: userEmail, roleId, roleName, permissions })
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
