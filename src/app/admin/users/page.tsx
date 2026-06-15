'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'
import toast from 'react-hot-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface StudentRecord {
  userId: string
  email: string
  fullName: string
  phone?: string
  dateOfBirth?: string
  profilePictureUrl?: string
  enrolledCourses?: string[]
  paymentMethodAdded?: boolean
  cardLastFour?: string
  totalTimeSpentSeconds?: number
  lastActiveAt?: string
  createdAt?: string
}

interface EmployeeRecord {
  userId: string
  email: string
  fullName: string
  phone?: string
  role?: string
  department?: string
  profilePictureUrl?: string
  lastActiveAt?: string
  createdAt?: string
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return '—' }
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function Avatar({ url, name }: { url?: string; name: string }) {
  return (
    <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
      {url
        ? <img src={url} alt={name} className="w-full h-full object-cover" />
        : <span className="text-xs font-semibold text-gray-500">{name.slice(0, 1).toUpperCase()}</span>}
    </div>
  )
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = rows.map(r => r.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function UsersPage() {
  const { getIdToken } = useAuth()
  const { hasPermission, loaded } = usePermissions()
  const router = useRouter()

  const [tab, setTab] = useState<'students' | 'employees'>('students')
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const apiFetch = useCallback(async (path: string) => {
    const token = await getIdToken()
    const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  }, [getIdToken])

  useEffect(() => {
    if (!loaded) return
    if (!hasPermission('manage_users')) { setLoading(false); return }
    Promise.all([
      apiFetch('/students').then(setStudents).catch(() => setStudents([])),
      apiFetch('/employees').then(setEmployees).catch(() => setEmployees([])),
    ]).catch(err => toast.error(err.message)).finally(() => setLoading(false))
  }, [loaded, hasPermission, apiFetch])

  useEffect(() => {
    if (loaded && !hasPermission('manage_users')) router.replace('/courses')
  }, [loaded, hasPermission, router])

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(s => !q || s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q))
  }, [students, search])

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase()
    return employees.filter(e => !q || e.fullName?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q))
  }, [employees, search])

  const exportStudents = () => {
    const rows: (string | number)[][] = [
      ['Full Name', 'Email', 'Phone', 'Enrolled Courses', 'Time in App', 'Last Active', 'Joined', 'Payment Method'],
      ...filteredStudents.map(s => [
        s.fullName || '', s.email || '', s.phone || '',
        s.enrolledCourses?.length ?? 0,
        formatDuration(s.totalTimeSpentSeconds),
        formatDateTime(s.lastActiveAt), formatDate(s.createdAt),
        s.paymentMethodAdded ? 'Yes' : 'No',
      ]),
    ]
    downloadCsv('students.csv', rows)
  }

  if (!loaded) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>

  if (!hasPermission('manage_users')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
          <p className="text-gray-500">You need the manage_users permission to view this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 mt-1">Manage students and employees across the platform.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          <button onClick={() => { setTab('students'); setExpanded(null) }} className={`px-5 py-2 rounded-full text-sm font-semibold transition ${tab === 'students' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Students ({students.length})
          </button>
          <button onClick={() => { setTab('employees'); setExpanded(null) }} className={`px-5 py-2 rounded-full text-sm font-semibold transition ${tab === 'employees' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            Employees ({employees.length})
          </button>
        </div>
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-72"
        />
        {tab === 'students' && (
          <button onClick={exportStudents} className="ml-auto px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-full hover:bg-gray-200 transition">
            Export CSV
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : tab === 'students' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Phone</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Courses</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Time in App</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Last Active</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Joined</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStudents.map(s => (
                <>
                  <tr key={s.userId} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === s.userId ? null : s.userId)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar url={s.profilePictureUrl} name={s.fullName || s.email} />
                        <span className="font-medium text-gray-900 text-sm">{s.fullName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.email}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.enrolledCourses?.length ?? 0}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDuration(s.totalTimeSpentSeconds)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(s.lastActiveAt)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.paymentMethodAdded ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.paymentMethodAdded ? 'Yes' : 'No'}
                      </span>
                    </td>
                  </tr>
                  {expanded === s.userId && (
                    <tr key={s.userId + '-detail'} className="bg-gray-50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">Profile</p>
                            <p>Date of birth: {s.dateOfBirth || '—'}</p>
                            <p>User ID: <span className="font-mono text-xs">{s.userId}</span></p>
                            <p>Card on file: {s.cardLastFour ? `•••• ${s.cardLastFour}` : '—'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-xs uppercase mb-1">Enrolled courses</p>
                            {s.enrolledCourses && s.enrolledCourses.length > 0
                              ? <ul className="list-disc list-inside">{s.enrolledCourses.map((c, i) => <li key={i}>{c}</li>)}</ul>
                              : <p className="text-gray-400">No enrolled courses yet.</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filteredStudents.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-gray-400">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Name</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Email</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Department</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Last Active</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEmployees.map(e => (
                <tr key={e.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar url={e.profilePictureUrl} name={e.fullName || e.email} />
                      <span className="font-medium text-gray-900 text-sm">{e.fullName || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">{e.role || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{e.department || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(e.lastActiveAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(e.createdAt)}</td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
