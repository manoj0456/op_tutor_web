'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

// Page-access -> permission mapping for the role builder
const PAGE_PERMISSIONS: { label: string; permission: string }[] = [
  { label: 'Courses',            permission: 'view_content' },
  { label: 'Live Sessions',      permission: 'view_content' },
  { label: 'Content Management', permission: 'manage_courses' },
  { label: 'Users',              permission: 'manage_users' },
  { label: 'Roles',              permission: 'manage_roles' },
  { label: 'Reports (future)',   permission: 'view_reports' },
]
const UNIQUE_PAGE_PERMS = Array.from(new Map(PAGE_PERMISSIONS.map(p => [p.permission, p])).values())

interface Role {
  roleId: string
  name: string
  description?: string
  permissions: string[]
  isSystem?: boolean
}

interface UserRecord {
  email: string
  name?: string
  roleId: string
  roleName: string
}

export default function RolesPage() {
  const { getIdToken }             = useAuth()
  const { isSuperAdmin, loaded }   = usePermissions()
  const [roles, setRoles]          = useState<Role[]>([])
  const [users, setUsers]          = useState<UserRecord[]>([])
  const [tab, setTab]              = useState<'roles' | 'users'>('users')
  const [loading, setLoading]      = useState(true)
  const [newRole, setNewRole]      = useState({ name: '', description: '', permissions: [] as string[] })
  const [roleSaving, setRoleSaving] = useState(false)

  const apiFetch = useCallback(async (path: string, opts: RequestInit = {}) => {
    const token = await getIdToken()
    const res   = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers ?? {}) },
    })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [getIdToken])

  useEffect(() => {
    if (!loaded || !isSuperAdmin) { setLoading(false); return }
    Promise.all([
      apiFetch('/roles').then(setRoles),
      apiFetch('/users').then(setUsers),
    ]).catch(err => toast.error(err.message)).finally(() => setLoading(false))
  }, [loaded, isSuperAdmin, apiFetch])

  const assignRole = async (email: string, roleId: string) => {
    try {
      await apiFetch(`/users/${encodeURIComponent(email)}/role`, {
        method: 'PUT',
        body: JSON.stringify({ roleId }),
      })
      toast.success('Role updated')
      const updated = await apiFetch('/users')
      setUsers(updated)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  const togglePerm = (perm: string) =>
    setNewRole(r => ({ ...r, permissions: r.permissions.includes(perm) ? r.permissions.filter(p => p !== perm) : [...r.permissions, perm] }))

  const createRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRole.name.trim()) { toast.error('Role name is required'); return }
    setRoleSaving(true)
    try {
      const created = await apiFetch('/roles', { method: 'POST', body: JSON.stringify({ roleName: newRole.name.trim(), description: newRole.description.trim(), permissions: newRole.permissions }) })
      setRoles(prev => [...prev, created])
      setNewRole({ name: '', description: '', permissions: [] })
      toast.success('Role created')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create role')
    } finally { setRoleSaving(false) }
  }

  const deleteRole = async (roleId: string) => {
    if (!confirm('Delete this role?')) return
    try {
      await apiFetch(`/roles/${encodeURIComponent(roleId)}`, { method: 'DELETE' })
      setRoles(prev => prev.filter(r => r.roleId !== roleId))
      toast.success('Role deleted')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role')
    }
  }

  if (!loaded) return <div className="flex items-center justify-center min-h-screen">Loading...</div>

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500">Only SUPER_ADMIN users can manage roles.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Roles &amp; Permissions</h1>
      <p className="text-gray-500 mb-8">Manage roles and assign them to users.</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('users')} className={`px-5 py-2 rounded-full text-sm font-semibold transition ${tab === 'users' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Users
        </button>
        <button onClick={() => setTab('roles')} className={`px-5 py-2 rounded-full text-sm font-semibold transition ${tab === 'roles' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Roles
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : tab === 'users' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Current Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Assign Role</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.email} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{u.name || u.email}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                      {u.roleName || u.roleId}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      defaultValue={u.roleId}
                      onChange={e => assignRole(u.email, e.target.value)}
                      className="border rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {roles.map(r => (
                        <option key={r.roleId} value={r.roleId}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-gray-400">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4">
          {/* Add New Role */}
          <form onSubmit={createRole} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-3">Add New Role</h2>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Role name" value={newRole.name} onChange={e => setNewRole(r => ({ ...r, name: e.target.value }))} />
              <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Description" value={newRole.description} onChange={e => setNewRole(r => ({ ...r, description: e.target.value }))} />
            </div>
            <p className="text-xs font-medium text-gray-500 mb-2">Page access</p>
            <div className="flex flex-wrap gap-3 mb-4">
              {UNIQUE_PAGE_PERMS.map(pp => (
                <label key={pp.permission} className="flex items-center gap-1.5 text-sm text-gray-700">
                  <input type="checkbox" checked={newRole.permissions.includes(pp.permission)} onChange={() => togglePerm(pp.permission)} />
                  {pp.label}
                </label>
              ))}
            </div>
            <button type="submit" disabled={roleSaving} className="px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60 transition">
              {roleSaving ? 'Creating...' : 'Create Role'}
            </button>
          </form>

          {roles.map(r => (
            <div key={r.roleId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-bold text-gray-900">{r.name}</span>
                  {r.isSystem && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">System</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{r.roleId}</span>
                  {!r.isSystem && (
                    <button onClick={() => deleteRole(r.roleId)} className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 rounded px-2 py-0.5">Delete</button>
                  )}
                </div>
              </div>
              {r.description && <p className="text-sm text-gray-500 mb-3">{r.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {r.permissions?.map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
