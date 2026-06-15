'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

async function apiFetch(path: string, token: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

interface CognitoUser {
  userId: string
  email: string
  name: string
  groups: string[]
  createdAt: string
}

interface Role {
  roleId: string
  name: string
  permissions: string[]
}

type Tab = 'roles' | 'all-users' | 'students'

const KNOWN_GROUPS = ['ADMIN', 'TEACHER', 'STUDENT', 'SUPER_ADMIN']

export default function AdminRolesPage() {
  const { getIdToken } = useAuth()
  const { isSuperAdmin, loaded } = usePermissions()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<Tab>('roles')
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<CognitoUser[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (loaded && !isSuperAdmin) router.replace('/dashboard')
  }, [loaded, isSuperAdmin, router])

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true)
    setError(null)
    try {
      const token = await getIdToken()
      const data = await apiFetch('/roles', token)
      setRoles(data ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingRoles(false)
    }
  }, [getIdToken])

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true)
    setError(null)
    try {
      const token = await getIdToken()
      const data = await apiFetch('/admin/users', token)
      setUsers(data.users ?? [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingUsers(false)
    }
  }, [getIdToken])

  useEffect(() => {
    if (!loaded || !isSuperAdmin) return
    if (activeTab === 'roles') fetchRoles()
    else fetchUsers()
  }, [activeTab, loaded, isSuperAdmin, fetchRoles, fetchUsers])

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId)
    setError(null)
    setSuccessMsg(null)
    try {
      const token = await getIdToken()
      await apiFetch(`/admin/users/${encodeURIComponent(userId)}/role`, token, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      })
      setUsers(prev => prev.map(u =>
        u.userId === userId ? { ...u, groups: [newRole] } : u
      ))
      setSuccessMsg(`Role updated for ${userId}`)
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  if (!loaded) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!isSuperAdmin) return null

  const students = users.filter(u => u.groups.includes('STUDENT'))

  const UserTable = ({ userList }: { userList: CognitoUser[] }) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-3 font-medium text-gray-600">Name</th>
            <th className="text-left p-3 font-medium text-gray-600">Email</th>
            <th className="text-left p-3 font-medium text-gray-600">Current Role</th>
            <th className="text-left p-3 font-medium text-gray-600">Change Role</th>
            <th className="text-left p-3 font-medium text-gray-600">Joined</th>
          </tr>
        </thead>
        <tbody>
          {userList.length === 0 && (
            <tr><td colSpan={5} className="p-4 text-center text-gray-400">No users found.</td></tr>
          )}
          {userList.map(u => (
            <tr key={u.userId} className="border-b hover:bg-gray-50 transition">
              <td className="p-3 font-medium text-gray-800">{u.name}</td>
              <td className="p-3 text-gray-600">{u.email}</td>
              <td className="p-3">
                {u.groups.length > 0
                  ? u.groups.map(g => (
                      <span key={g} className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full mr-1">{g}</span>
                    ))
                  : <span className="text-gray-400 text-xs">No group</span>
                }
              </td>
              <td className="p-3">
                <select
                  disabled={updatingUserId === u.userId}
                  value={u.groups[0] ?? ''}
                  onChange={e => handleRoleChange(u.userId, e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- select --</option>
                  {KNOWN_GROUPS.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {updatingUserId === u.userId && (
                  <span className="ml-2 text-xs text-gray-400">Saving...</span>
                )}
              </td>
              <td className="p-3 text-gray-500 text-xs">
                {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Roles & Users</h1>
          <p className="text-gray-500 text-sm mt-1">Manage roles, permissions, and user group assignments</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{successMsg}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {(['roles', 'all-users', 'students'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'roles' ? 'Roles' : tab === 'all-users' ? 'All Users' : 'Students'}
            </button>
          ))}
        </div>

        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Roles</h2>
              <button
                onClick={fetchRoles}
                className="text-xs text-primary-600 hover:underline"
              >Refresh</button>
            </div>
            {loadingRoles ? (
              <div className="p-8 text-center text-gray-400">Loading roles...</div>
            ) : (
              <div className="divide-y">
                {roles.length === 0 && (
                  <div className="p-6 text-center text-gray-400">No roles defined yet.</div>
                )}
                {roles.map(role => (
                  <div key={role.roleId} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800">{role.name}</span>
                      <span className="text-xs text-gray-400">{role.roleId}</span>
                    </div>
                    {role.permissions && role.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map(p => (
                          <span key={p} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Users Tab */}
        {activeTab === 'all-users' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">All Users ({users.length})</h2>
              <button onClick={fetchUsers} className="text-xs text-primary-600 hover:underline">Refresh</button>
            </div>
            {loadingUsers ? (
              <div className="p-8 text-center text-gray-400">Loading users...</div>
            ) : (
              <UserTable userList={users} />
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Students ({students.length})</h2>
              <button onClick={fetchUsers} className="text-xs text-primary-600 hover:underline">Refresh</button>
            </div>
            {loadingUsers ? (
              <div className="p-8 text-center text-gray-400">Loading users...</div>
            ) : (
              <UserTable userList={students} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
