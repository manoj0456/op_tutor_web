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

interface Employee {
  userId: string
  email: string
  fullName: string
  phone?: string
  role: string
  department?: string
  hireDate?: string
  status?: string
  createdAt: string
}

interface Role {
  roleId: string
  name: string
  description?: string
  permissions: string[]
}

type Tab = 'students' | 'employees' | 'roles'

// ── Permission definitions ────────────────────────────────────────────────────
const PAGE_PERMISSIONS = [
  { id: 'view_courses',  label: 'Courses' },
  { id: 'view_live',     label: 'Live Sessions' },
  { id: 'manage_courses', label: 'Content Management' },
  { id: 'manage_roles',  label: 'Roles & Permissions' },
] as const

const ACTION_PERMISSIONS = [
  { id: 'manage_employees', label: 'Add / Edit / Delete Employees' },
    { id: 'manage_students',  label: 'Add / Edit / Delete Students' },
  { id: 'manage_students',  label: 'Add Student' },
  { id: 'promote_admins',   label: 'Reset Password / Change User Roles' },
] as const

// ── Role badge helper ────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700',
    ADMIN:       'bg-blue-100 text-blue-700',
    TEACHER:     'bg-green-100 text-green-700',
  }
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${colors[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role}
    </span>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const isActive = (status || 'active').toLowerCase() === 'active'
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

// ── Add / Edit Role Modal ────────────────────────────────────────────────────
interface RoleModalProps {
  initial?: Role
  onClose: () => void
  onSubmit: (data: { name: string; description: string; permissions: string[] }) => Promise<void>
}

function RoleModal({ initial, onClose, onSubmit }: RoleModalProps) {
  const [name, setName]               = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(
    new Set(initial?.permissions ?? [])
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const toggle = (id: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Role name is required'); return }
    setSubmitting(true); setError(null)
    try {
      await onSubmit({ name: name.trim(), description: description.trim(), permissions: Array.from(selectedPerms) })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save role')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{initial ? 'Edit Role' : 'Add Role'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">&times;</button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Content Manager"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this role"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Pages access */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Pages Access</p>
            <div className="space-y-2">
              {PAGE_PERMISSIONS.map(p => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedPerms.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{p.label}</span>
                  <span className="text-xs text-gray-400">({p.id})</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Actions</p>
            <div className="space-y-2">
              {ACTION_PERMISSIONS.map(p => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedPerms.has(p.id)}
                    onChange={() => toggle(p.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{p.label}</span>
                  <span className="text-xs text-gray-400">({p.id})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50">
              {submitting ? 'Saving…' : (initial ? 'Save Changes' : 'Create Role')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Add Employee Modal ────────────────────────────────────────────────────────
interface AddEmployeeModalProps {
  onClose: () => void
  onSubmit: (data: {
    fullName: string; email: string; phone: string;
    role: string; department: string; hireDate: string; status: string
  }) => Promise<void>
}

function AddEmployeeModal({ onClose, onSubmit }: AddEmployeeModalProps) {
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [phone, setPhone]           = useState('')
  const [role, setRole]             = useState('ADMIN')
  const [department, setDepartment] = useState('')
  const [hireDate, setHireDate]     = useState('')
  const [status, setStatus]         = useState('active')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) { setError('Name and email are required'); return }
    setSubmitting(true); setError(null)
    try {
      await onSubmit({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), role, department: department.trim(), hireDate, status })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create employee')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Employee</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">&times;</button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Smith"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="ADMIN">Admin</option>
              <option value="TEACHER">Teacher</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Engineering"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
            <input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit Employee Modal ───────────────────────────────────────────────────────
interface EditEmployeeModalProps {
  employee: Employee
  onClose: () => void
  onSubmit: (userId: string, data: Partial<Employee>) => Promise<void>
}

function EditEmployeeModal({ employee, onClose, onSubmit }: EditEmployeeModalProps) {
  const [fullName, setFullName]     = useState(employee.fullName)
  const [phone, setPhone]           = useState(employee.phone ?? '')
  const [department, setDepartment] = useState(employee.department ?? '')
  const [role, setRole]             = useState(employee.role)
  const [status, setStatus]         = useState(employee.status ?? 'active')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) { setError('Name is required'); return }
    setSubmitting(true); setError(null)
    try {
      await onSubmit(employee.userId, { fullName: fullName.trim(), phone: phone.trim(), department: department.trim(), role, status })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update employee')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Edit Employee</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">&times;</button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{employee.email}</p>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="TEACHER">Teacher</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Delete Employee Confirm Modal ─────────────────────────────────────────────
interface DeleteEmployeeModalProps {
  employee: Employee
  onClose: () => void
  onConfirm: (userId: string) => Promise<void>
}

function DeleteEmployeeModal({ employee, onClose, onConfirm }: DeleteEmployeeModalProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleConfirm = async () => {
    setDeleting(true); setError(null)
    try {
      await onConfirm(employee.userId)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee')
    } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Delete Employee</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Delete <span className="font-medium text-gray-800">{employee.fullName}</span>? This will remove them from the system.
        </p>
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={deleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50">
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Student Modal ─────────────────────────────────────────────────────────
interface AddStudentModalProps {
  onClose: () => void
  onSubmit: (fullName: string, email: string, phone: string, dateOfBirth: string) => Promise<void>
}

function AddStudentModal({ onClose, onSubmit }: AddStudentModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [dob, setDob]           = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim() || !email.trim()) { setError('Full name and email are required'); return }
    setSubmitting(true); setError(null)
    try {
      await onSubmit(fullName.trim(), email.trim(), phone.trim(), dob)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create student')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Student</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">&times;</button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Doe"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function generateTempPassword(): string {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower   = 'abcdefghjkmnpqrstuvwxyz'
  const digits  = '23456789'
  const symbols = '!@#$%^&*'
  const all     = upper + lower + digits + symbols
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]
  const base = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  for (let i = 0; i < 6; i++) base.push(pick(all))
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]]
  }
  return base.join('')
}

interface ResetPasswordModalProps {
  userName: string
  onClose: () => void
  onConfirm: (temporaryPassword: string) => Promise<void>
}

function ResetPasswordModal({ userName, onClose, onConfirm }: ResetPasswordModalProps) {
  const [password, setPassword]     = useState(() => generateTempPassword())
  const [copied, setCopied]         = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(password).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const handleConfirm = async () => {
    if (!password.trim()) { setError('Password cannot be empty'); return }
    setSubmitting(true); setError(null)
    try { await onConfirm(password.trim()); onClose() }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to reset password') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none" aria-label="Close">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Set a temporary password for <span className="font-medium text-gray-800">{userName}</span>.
          They will be required to change it on first login.
        </p>
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
          <div className="flex gap-2">
            <input type="text" value={password} onChange={e => setPassword(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <button type="button" onClick={copyToClipboard}
              className="px-3 py-2 text-xs border border-gray-300 rounded hover:bg-gray-50 text-gray-600 whitespace-nowrap">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <button type="button" onClick={() => setPassword(generateTempPassword())} className="mt-1 text-xs text-primary-600 hover:underline">
            Regenerate
          </button>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={handleConfirm} disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded hover:bg-amber-700 disabled:opacity-50">
            {submitting ? 'Resetting...' : 'Confirm Reset'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface EditStudentModalProps {
  student: CognitoUser
  onClose: () => void
  onSubmit: (userId: string, data: { name: string; email: string }) => Promise<void>
}
function EditStudentModal({ student, onClose, onSubmit }: EditStudentModalProps) {
  const [name, setName]       = useState(student.name)
  const [email, setEmail]     = useState(student.email)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required'); return }
    setSubmitting(true); setError(null)
    try { await onSubmit(student.userId, { name: name.trim(), email: email.trim() }); onClose() }
    catch (err: any) { setError(err.message || 'Failed to update student') }
    finally { setSubmitting(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Student</h2>
        {error && <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
              {submitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface DeleteStudentModalProps {
  student: CognitoUser
  onClose: () => void
  onConfirm: (userId: string) => Promise<void>
}
function DeleteStudentModal({ student, onClose, onConfirm }: DeleteStudentModalProps) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const handleConfirm = async () => {
    setConfirming(true); setError(null)
    try { await onConfirm(student.userId); onClose() }
    catch (err: any) { setError(err.message || 'Failed to delete student'); setConfirming(false) }
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-2">Delete Student</h2>
        <p className="text-sm text-gray-600 mb-4">
          Delete <strong>{student.name}</strong>? This will remove them from the system and the STUDENT group. This cannot be undone.
        </p>
        {error && <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleConfirm} disabled={confirming}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
            {confirming ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminRolesPage() {
  const { getIdToken } = useAuth()
  const { hasPermission, isSuperAdmin, userRole, loaded } = usePermissions()
  const router = useRouter()

  const canManageEmployees = hasPermission('manage_employees')
  const canManageRoles     = hasPermission('manage_roles')
  const canManageStudents  = hasPermission('manage_students')

  const [activeTab, setActiveTab] = useState<Tab>('students')

  // Roles
  const [roles, setRoles]               = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [roleModalTarget, setRoleModalTarget] = useState<Role | null | 'new'>(null)

  // Students (Cognito list)
  const [users, setUsers]               = useState<CognitoUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Employees (DynamoDB)
  const [employees, setEmployees]           = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  const [error, setError]         = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  // Modal state
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showAddStudent, setShowAddStudent]   = useState(false)
  const [editTarget, setEditTarget]           = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget]       = useState<Employee | null>(null)
  const [resetTarget, setResetTarget]         = useState<{ userId: string; name: string } | null>(null)
  const [editStudentTarget,   setEditStudentTarget]   = useState<CognitoUser | null>(null)
  const [deleteStudentTarget, setDeleteStudentTarget] = useState<CognitoUser | null>(null)
  const [createdEmpPassword, setCreatedEmpPassword] = useState<{ name: string; email: string; password: string } | null>(null)
  const [createdStudentPassword, setCreatedStudentPassword] = useState<{ name: string; email: string; password: string } | null>(null)

  // Guard: require manage_roles permission
  useEffect(() => {
    if (!loaded) return
    if (userRole === null) return
    if (!canManageRoles) router.replace('/')
  }, [loaded, canManageRoles, router, userRole])

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true); setError(null)
    try {
      const token = await getIdToken()
      const data = await apiFetch('/roles', token)
      setRoles(data ?? [])
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load roles') }
    finally { setLoadingRoles(false) }
  }, [getIdToken])

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true); setError(null)
    try {
      const token = await getIdToken()
      const data = await apiFetch('/admin/users', token)
      setUsers(data.users ?? [])
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load users') }
    finally { setLoadingUsers(false) }
  }, [getIdToken])

  const fetchEmployees = useCallback(async () => {
    setLoadingEmployees(true); setError(null)
    try {
      const token = await getIdToken()
      const data = await apiFetch('/employees', token)
      setEmployees(Array.isArray(data) ? data : [])
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load employees') }
    finally { setLoadingEmployees(false) }
  }, [getIdToken])

  useEffect(() => {
    if (!loaded || !canManageRoles) return
    if (activeTab === 'roles')          fetchRoles()
    else if (activeTab === 'employees') fetchEmployees()
    else                                fetchUsers()
  }, [activeTab, loaded, canManageRoles, fetchRoles, fetchUsers, fetchEmployees])

  const flash = (msg: string, ms = 3000) => {
    setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), ms)
  }

  // Role CRUD
  const handleAddRole = async (data: { name: string; description: string; permissions: string[] }) => {
    const token = await getIdToken()
    await apiFetch('/roles', token, { method: 'POST', body: JSON.stringify({ name: data.name, description: data.description, permissions: data.permissions }) })
    flash('Role created successfully')
    fetchRoles()
  }

  const handleEditRole = async (roleId: string, data: { name: string; description: string; permissions: string[] }) => {
    const token = await getIdToken()
    await apiFetch(`/roles/${encodeURIComponent(roleId)}`, token, { method: 'PUT', body: JSON.stringify({ name: data.name, description: data.description, permissions: data.permissions }) })
    flash('Role updated successfully')
    fetchRoles()
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId); setError(null)
    try {
      const token = await getIdToken()
      await apiFetch(`/admin/users/${encodeURIComponent(userId)}/role`, token, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      })
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, groups: [newRole] } : u))
      flash('Role updated successfully')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to update role') }
    finally { setUpdatingUserId(null) }
  }

  const handleAddEmployee = async (data: {
    fullName: string; email: string; phone: string;
    role: string; department: string; hireDate: string; status: string
  }) => {
    const token = await getIdToken()
    const result = await apiFetch('/employees', token, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    fetchEmployees()
    if (result?.temporaryPassword) {
      setCreatedEmpPassword({ name: data.fullName, email: data.email, password: result.temporaryPassword })
    } else {
      flash('Employee created successfully')
    }
  }

  const handleEditEmployee = async (userId: string, data: Partial<Employee>) => {
    const token = await getIdToken()
    await apiFetch(`/employees/${encodeURIComponent(userId)}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    flash('Employee updated successfully')
    fetchEmployees()
  }

  const handleDeleteEmployee = async (userId: string) => {
    const token = await getIdToken()
    await apiFetch(`/employees/${encodeURIComponent(userId)}`, token, { method: 'DELETE' })
    flash('Employee deleted successfully')
    fetchEmployees()
  }

  const handleAddStudent = async (fullName: string, email: string, phone: string, dateOfBirth: string) => {
    const token  = await getIdToken()
    const userId = crypto.randomUUID()
    await apiFetch('/students', token, {
      method: 'POST',
      body: JSON.stringify({ userId, email, fullName, phone, dateOfBirth }),
    })
    flash('Student created successfully')
    fetchUsers()
  }

  const handleResetPassword = async (temporaryPassword: string) => {
    if (!resetTarget) return
    const token = await getIdToken()
    await apiFetch(`/admin/users/${encodeURIComponent(resetTarget.userId)}/reset-password`, token, {
      method: 'POST',
      body: JSON.stringify({ temporaryPassword }),
    })
    flash('Temporary password set. Share it with the user.', 4000)
  }

  if (!loaded) return <div className="p-8 text-center text-gray-500">Loading...</div>
  if (!canManageRoles) return null

  const students = users.filter(u => u.groups.includes('STUDENT'))

  const tabs: { id: Tab; label: string }[] = [
    { id: 'students',  label: 'Students'  },
    { id: 'employees', label: 'Employees' },
    { id: 'roles',     label: 'Roles'     },
  ]
  const handleEditStudent = async (userId: string, data: { name: string; email: string }) => {
    const token = await getIdToken()
    await apiFetch(`/students/${encodeURIComponent(userId)}`, token, {
      method: 'PUT',
      body: JSON.stringify({ fullName: data.name, email: data.email }),
    })
    flash('Student updated successfully')
    fetchUsers()
  }

  const handleDeleteStudent = async (userId: string) => {
    const token = await getIdToken()
    await apiFetch(`/students/${encodeURIComponent(userId)}`, token, { method: 'DELETE' })
    flash('Student deleted successfully')
    fetchUsers()
  }



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Temp password modal after employee creation */}
      {createdEmpPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Employee Created</h2>
            <p className="text-sm text-gray-600 mb-4">
              Share this temporary password with <span className="font-medium">{createdEmpPassword.name}</span> (<span className="text-gray-500">{createdEmpPassword.email}</span>).
              They will be prompted to set a new password on first login.
            </p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-2 mb-4">
              <span className="flex-1 font-mono text-sm select-all">{createdEmpPassword.password}</span>
              <button onClick={() => { navigator.clipboard.writeText(createdEmpPassword.password) }}
                className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700">Copy</button>
            </div>
            <button onClick={() => setCreatedEmpPassword(null)}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded hover:bg-gray-800">Done</button>
          </div>
        </div>
      )}

      {/* Role modal (add or edit) */}
      {roleModalTarget !== null && (
        <RoleModal
          initial={roleModalTarget === 'new' ? undefined : roleModalTarget}
          onClose={() => setRoleModalTarget(null)}
          onSubmit={async (data) => {
            if (roleModalTarget === 'new') {
              await handleAddRole(data)
            } else {
              await handleEditRole(roleModalTarget.roleId, data)
            }
          }}
        />
      )}

      {/* Student created — show temporary password */}
  {createdStudentPassword && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Student Created</h2>
        <p className="text-sm text-gray-600 mb-4">
          Share this temporary password with{' '}
          <span className="font-medium">{createdStudentPassword.name}</span>{' '}
          (<span className="text-gray-500">{createdStudentPassword.email}</span>).
          They will be prompted to set a new password on first login.
        </p>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-3 py-2 mb-4">
          <span className="flex-1 font-mono text-sm select-all">{createdStudentPassword.password}</span>
          <button onClick={() => { navigator.clipboard.writeText(createdStudentPassword.password) }}
            className="text-xs px-2 py-1 bg-primary-600 text-white rounded hover:bg-primary-700">Copy</button>
        </div>
        <button onClick={() => setCreatedStudentPassword(null)}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded hover:bg-gray-800">Done</button>
      </div>
    </div>
  )}
  {showAddEmployee && <AddEmployeeModal onClose={() => setShowAddEmployee(false)} onSubmit={handleAddEmployee} />}
      {showAddStudent  && <AddStudentModal  onClose={() => setShowAddStudent(false)}  onSubmit={handleAddStudent}  />}
      {editTarget   && <EditEmployeeModal   employee={editTarget}   onClose={() => setEditTarget(null)}   onSubmit={handleEditEmployee} />}
      {deleteTarget && <DeleteEmployeeModal employee={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteEmployee} />}
      {resetTarget  && <ResetPasswordModal  userName={resetTarget.name} onClose={() => setResetTarget(null)} onConfirm={handleResetPassword} />}
      {editStudentTarget   && <EditStudentModal   student={editStudentTarget}   onClose={() => setEditStudentTarget(null)}   onSubmit={handleEditStudent} />}
      {deleteStudentTarget && <DeleteStudentModal student={deleteStudentTarget} onClose={() => setDeleteStudentTarget(null)} onConfirm={handleDeleteStudent} />}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="text-gray-500 text-sm mt-1">Manage students, employees, and role permissions</p>
        </div>

        {error      && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
        {successMsg && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{successMsg}</div>}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition -mb-px ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
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
                <button onClick={fetchUsers} className="text-xs text-primary-600 hover:underline">Refresh</button>
                {hasPermission('manage_students') && (
                  <button onClick={() => setShowAddStudent(true)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition">
                    + Add Student
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
                      {isSuperAdmin && <th className="text-left p-3 font-medium text-gray-600">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 && (
                      <tr><td colSpan={isSuperAdmin ? 6 : 5} className="p-4 text-center text-gray-400">No students found.</td></tr>
                    )}
                    {students.map(u => (
                      <tr key={u.userId} className="border-b hover:bg-gray-50 transition">
                        <td className="p-3 font-medium text-gray-800">{u.name}</td>
                        <td className="p-3 text-gray-600">{u.email}</td>
                        <td className="p-3 text-gray-600 text-center">{u.enrolledCourses != null ? u.enrolledCourses : '—'}</td>
                        <td className="p-3 text-gray-500 text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                        <td className="p-3 text-gray-500 text-xs">{u.lastActive ? new Date(u.lastActive).toLocaleDateString() : '—'}</td>
                        {isSuperAdmin && (
                          <td className="p-3">
                        <div className="flex items-center gap-2">
                          {canManageStudents && (
                            <button onClick={() => setEditStudentTarget(u)} title="Edit student"
                              className="text-gray-500 hover:text-primary-600 transition" aria-label="Edit">✏️</button>
                          )}
                          {canManageStudents && (
                            <button onClick={() => setDeleteStudentTarget(u)} title="Delete student"
                              className="text-gray-400 hover:text-red-600 transition" aria-label="Delete">🗑️</button>
                          )}
                          {isSuperAdmin && (
                            <button onClick={() => setResetTarget({ userId: u.userId, name: u.name })} title="Reset password"
                              className="text-amber-600 hover:text-amber-800 text-xs font-medium px-2 py-1 border border-amber-300 rounded hover:bg-amber-50 transition">
                              🔑 Reset
                            </button>
                          )}
                        </div>
                      </td>
                        )}
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
              <div className="flex items-center gap-3">
                <button onClick={fetchEmployees} className="text-xs text-primary-600 hover:underline">Refresh</button>
                {canManageEmployees && (
                  <button onClick={() => setShowAddEmployee(true)}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 transition">
                    + Add Employee
                  </button>
                )}
              </div>
            </div>

            {!isSuperAdmin && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-amber-700 text-xs">
                You are viewing in read-only mode. Contact a Super Admin for changes.
              </div>
            )}

            {loadingEmployees ? (
              <div className="p-8 text-center text-gray-400">Loading employees...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-600">Name</th>
                      <th className="text-left p-3 font-medium text-gray-600">Email</th>
                      <th className="text-left p-3 font-medium text-gray-600">Phone</th>
                      <th className="text-left p-3 font-medium text-gray-600">Role</th>
                      <th className="text-left p-3 font-medium text-gray-600">Department</th>
                      <th className="text-left p-3 font-medium text-gray-600">Hire Date</th>
                      <th className="text-left p-3 font-medium text-gray-600">Status</th>
                      <th className="text-left p-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.length === 0 && (
                      <tr><td colSpan={8} className="p-4 text-center text-gray-400">No employees found.</td></tr>
                    )}
                    {employees.map(emp => (
                      <tr key={emp.userId} className="border-b hover:bg-gray-50 transition">
                        <td className="p-3 font-medium text-gray-800">{emp.fullName}</td>
                        <td className="p-3 text-gray-600">{emp.email}</td>
                        <td className="p-3 text-gray-500">{emp.phone || '—'}</td>
                        <td className="p-3"><RoleBadge role={emp.role} /></td>
                        <td className="p-3 text-gray-600">{emp.department || '—'}</td>
                        <td className="p-3 text-gray-500 text-xs">
                          {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-3"><StatusBadge status={emp.status} /></td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {canManageEmployees && (
                              <button onClick={() => setEditTarget(emp)} title="Edit employee"
                                className="text-gray-500 hover:text-primary-600 transition" aria-label="Edit">✏️</button>
                            )}
                            {isSuperAdmin && (
                              <button onClick={() => setDeleteTarget(emp)} title="Delete employee"
                                className="text-gray-400 hover:text-red-600 transition" aria-label="Delete">🗑️</button>
                            )}
                            {isSuperAdmin && (
                              <button onClick={() => setResetTarget({ userId: emp.email, name: emp.fullName })} title="Reset password"
                                className="text-amber-600 hover:text-amber-800 text-xs font-medium px-2 py-1 border border-amber-300 rounded hover:bg-amber-50 transition">
                                🔑
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
              <div className="flex items-center gap-3">
                <button onClick={fetchRoles} className="text-xs text-primary-600 hover:underline">Refresh</button>
                <button onClick={() => setRoleModalTarget('new')}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded hover:bg-primary-700 transition">
                  + Add Role
                </button>
              </div>
            </div>
            {loadingRoles ? (
              <div className="p-8 text-center text-gray-400">Loading roles...</div>
            ) : (
              <div className="divide-y">
                {roles.length === 0 && (
                  <div className="p-6 text-center text-gray-400">No roles defined yet. Create one with the button above.</div>
                )}
                {roles.map(role => (
                  <div key={role.roleId} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-800">{role.name}</span>
                        {role.description && (
                          <span className="text-sm text-gray-500">{role.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{role.roleId}</span>
                        <button
                          onClick={() => setRoleModalTarget(role)}
                          title="Edit role"
                          className="ml-2 text-gray-400 hover:text-primary-600 transition p-1 rounded hover:bg-gray-100"
                          aria-label="Edit role"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                    {role.permissions && role.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
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
