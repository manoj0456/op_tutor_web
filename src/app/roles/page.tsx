'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

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

interface Employee {
  userId: string
  email: string
  fullName: string
  phone?: string
  role: 'ADMIN' | 'TEACHER'
  department?: string
  createdAt?: string
}

export default function RolesPage() {
  const { getIdToken }             = useAuth()
  const { isSuperAdmin, loaded }   = usePermissions()
  const [roles, setRoles]          = useState<Role[]>([])
  const [users, setUsers]          = useState<UserRecord[]>([])
  const [tab, setTab]              = useState<'roles' | 'users' | 'employees'>('users')
  const [loading, setLoading]      = useState(true)
  const [employees, setEmployees]  = useState<Employee[]>([])
  const [empForm, setEmpForm]      = useState({ fullName: '', email: '', phone: '', role: 'TEACHER' as 'ADMIN' | 'TEACHER', department: '' })
  const [empSaving, setEmpSaving]  = useState(false)

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
      apiFetch('/employees').then(setEmployees).catch(() => setEmployees([])),
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

  const addEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empForm.fullName.trim() || !empForm.email.trim()) { toast.error('Full name and email are required'); return }
    setEmpSaving(true)
    try {
      const created = await apiFetch('/employees', { method: 'POST', body: JSON.stringify(empForm) })
      setEmployees(prev => [created, ...prev])
      setEmpForm({ fullName: '', email: '', phone: '', role: 'TEACHER', department: '' })
      toast.success('Employee added — a temporary password was emailed to them')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add employee')
    } finally {
      setEmpSaving(false)
    }
  }

  const removeEmployee = async (userId: string) => {
    if (!confirm('Remove this employee? Their account will be deleted.')) return
    try {
      await apiFetch(`/employees/${encodeURIComponent(userId)}`, { method: 'DELETE' })
      setEmployees(prev => prev.filter(e => e.userId !== userId))
      toast.success('Employee removed')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove employee')
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
        <button onClick={() => setTab('employees')} className={`px-5 py-2 rounded-full text-sm font-semibold transition ${tab === 'employees' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Employees
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
      ) : tab === 'roles' ? (
        <div className="grid gap-4">
          {roles.map(r => (
            <div key={r.roleId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-bold text-gray-900">{r.name}</span>
                  {r.isSystem && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">System</span>}
                </div>
                <span className="text-xs text-gray-400 font-mono">{r.roleId}</span>
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
      ) : (
        <div className="space-y-8">
          {/* Add employee form */}
          <form onSubmit={addEmployee} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-4">Add Employee</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full name</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={empForm.fullName} onChange={e => setEmpForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email address</label>
                <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone number</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={empForm.role} onChange={e => setEmpForm(f => ({ ...f, role: e.target.value as 'ADMIN' | 'TEACHER' }))}>
                  <option value="TEACHER">Teacher</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Department <span className="text-gray-400 font-normal">(optional)</span></label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" value={empForm.department} onChange={e => setEmpForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <button type="submit" disabled={empSaving} className="mt-4 px-5 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-60 transition">
              {empSaving ? 'Adding...' : 'Add Employee'}
            </button>
          </form>

          {/* Employees list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Name</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Email</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-3">Department</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map(emp => (
                  <tr key={emp.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{emp.fullName}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{emp.email}</td>
                    <td className="px-6 py-4"><span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">{emp.role}</span></td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{emp.department || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => removeEmployee(emp.userId)} className="text-red-500 hover:text-red-700 text-xs font-medium border border-red-200 rounded px-2 py-1">Remove</button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">No employees yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
