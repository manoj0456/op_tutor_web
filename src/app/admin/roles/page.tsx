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
  enrolledCourses?: number
  lastActive?: string
}

interface Role {
  roleId: string
  name: string
  permissions: string[]
}

type Tab = 'students' | 'employees' | 'roles'

const EMPLOYEE_GROUPS = ['SUPER_ADMIN', 'ADMIN', 'TEACHER']

// ── Add Employee Modal ────────────────────────────────────────────────────────
interface AddEmployeeModalProps {
  onClose: () => void
  onSubmit: (name: string, email: string, role: string) => Promise<void>
}

function AddEmployeeModal({ onClose, onSubmit }: AddEmployeeModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('ADMIN')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(name.trim(), email.trim(), role)
      onClose()
    } catch (err: any) {
      setError(err.message ?? 'Failed to create employee')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Employee</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ADMIN">Admin</option>
              <option value="TEACHER">Teacher</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminRolesPage() {
  const { getIdToken } = useAuth()
  const { isSuperAdmin, userRole, loaded } = usePermissions()
  const router = useRouter()

  const isAdmin = userRole?.roleId === 'ADMIN'
  const canManageEmployees = isSuperAdmin || isAdmin

  const [activeTab, setActiveTab] = useState<Tab>('students')
  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<CognitoUser[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showAddEmployee, setShowAddEmployee] = useState(false)

  // Only ADMIN and SUPER_ADMIN can access this page
  useEffect(() => {
    if (loaded && !canManageEmployees) router.replace('/dashboard')
  }, [loaded, canManageEmployees, router])

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
    if (!loaded || !canManageEmployees) return
    if (activeTab === 'roles') fetchRoles()
    else fetchUsers()
  }, [activeTab, loaded, canManageEmployees, fetchRoles, fetchUsers])

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
      setSuccessMsg('Role updated successfully')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleAddEmployee = async (name: string, email: string, role: string) => {
    const token = await getIdToken()
    await apiFetch('/employees', token, {
      method: 'POST',
      body: JSON.stringify({ name, email, role }),
    })
    setSuccessMsg('Employee created successfully')
    setTimeout(() => setSuccessMsg(null), 3000)
    fetchUsers()
  }

  if (!loaded) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!canManageEmployees) return null

  const students  = users.filter(u => u.groups.includes('STUDENT'))
  const employees = users.filter(u => u.groups.some(g => EMPLOYEE_GROUPS.includes(g)))

  const tabs: { id: Tab; label: string }[] = [
    { id: 'students',  label: 'Students'  },
    { id: 'employees', label: 'Employees' },
    { id: 'roles',     label: 'Roles'     },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {showAddEmployee && (
        <AddEmployeeModal
          onClose={() => setShowAddEmployee(false)}
          onSubmit={handleAddEmployee}
        />
      )}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 text-sm mt-1">Manage students, employees, and role permissions</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{successMsg}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab 1: Students ─────────────────────────────────────────────── */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">
                Students <span className="text-gray-400 font-normal text-sm">({students.length})</span>
              </h2>
              <div className="flex items-center gap-3">
                <button onClick={fetchUsers} className="text-xs text-primary-600 hover:underline">
                  Refresh
                </button>
                {canManageEmployees && (
                  <button
                    onClick={() => setShowAddEmployee(true)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 transition"
                  >
                    + Add Employee
                  </button>
                )}
              </div>
            </div>

            {loadingUsers ? (
              <div className="p-8 text-center text-gray-400">Loading students...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-600">Name</th>
                      <th className="text-left p-3 font-medium text-gray-600">Email</th>
                      <th className="text-left p-3 font-medium text-gray-600">Enrolled Courses</th>
                      <th className="text-left p-3 font-medium text-gray-600">Joined Date</th>
                      <th className="text-left p-3 font-medium text-gray-600">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-gray-400">No students found.</td>
                      </tr>
                    )}
                    {students.map(u => (
                      <tr key={u.userId} className="border-b hover:bg-gray-50 transition">
                        <td className="p-3 font-medium text-gray-800">{u.name}</td>
                        <td className="p-3 text-gray-600">{u.email}</td>
                        <td className="p-3 text-gray-600 text-center">
                          {u.enrolledCourses != null ? u.enrolledCourses : '—'}
                        </td>
                        <td className="p-3 text-gray-500 text-xs">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3 text-gray-500 text-xs">
                          {u.lastActive ? new Date(u.lastActive).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 2: Employees ────────────────────────────────────────────── */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">
                Employees <span className="text-gray-400 font-normal text-sm">({employees.length})</span>
              </h2>
              <button onClick={fetchUsers} className="text-xs text-primary-600 hover:underline">
                Refresh
              </button>
            </div>

            {!isSuperAdmin && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-700 text-xs">
                Role changes are restricted to Super Admins. You are viewing in read-only mode.
              </div>
            )}

            {loadingUsers ? (
              <div className="p-8 text-center text-gray-400">Loading employees...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-600">Name</th>
                      <th className="text-left p-3 font-medium text-gray-600">Email</th>
                      <th className="text-left p-3 font-medium text-gray-600">Current Role</th>
                      <th className="text-left p-3 font-medium text-gray-600">Assign Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-400">No employees found.</td>
                      </tr>
                    )}
                    {employees.map(u => {
                      const currentGroup = u.groups[0] ?? ''
                      return (
                        <tr key={u.userId} className="border-b hover:bg-gray-50 transition">
                          <td className="p-3 font-medium text-gray-800">{u.name}</td>
                          <td className="p-3 text-gray-600">{u.email}</td>
                          <td className="p-3">
                            {u.groups.length > 0
                              ? u.groups.map(g => (
                                  <span
                                    key={g}
                                    className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full mr-1"
                                  >
                                    {g}
                                  </span>
                                ))
                              : <span className="text-gray-400 text-xs">No group</span>
                            }
                          </td>
                          <td className="p-3">
                            {isSuperAdmin ? (
                              <>
                                <select
                                  disabled={updatingUserId === u.userId}
                                  value={currentGroup}
                                  onChange={e => handleRoleChange(u.userId, e.target.value)}
                                  className="border border-gray-300 rounded px-2 py-1 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                  <option value="">-- select --</option>
                                  {['SUPER_ADMIN', 'ADMIN', 'TEACHER'].map(g => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                                {updatingUserId === u.userId && (
                                  <span className="ml-2 text-xs text-gray-400">Saving...</span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-600 text-sm">{currentGroup || '—'}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 3: Roles ────────────────────────────────────────────────── */}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">Roles</h2>
              <button
                onClick={fetchRoles}
                className="text-xs text-primary-600 hover:underline"
              >
                Refresh
              </button>
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
      </div>
    </div>
  )
}
