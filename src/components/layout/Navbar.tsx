'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'

export function Navbar() {
  const { user, userEmail, signOut } = useAuth()
  const { hasPermission, loaded, isSuperAdmin } = usePermissions()
  const router = useRouter()

  const handleLogout = () => {
    signOut()
    router.push('/login')
  }

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-40 flex items-center justify-between">
        <Link href="/"><img src="/logos/logo-brand.png" alt="OpTutor" className="h-36 w-auto" /></Link>
        <div className="flex items-center gap-6">
          {(!loaded || hasPermission('view_courses')) && (
            <Link href="/courses" className="text-sm text-gray-600 hover:text-primary-600 transition">Courses</Link>
          )}
          {(!loaded || hasPermission('view_live')) && (
            <Link href="/live" className="text-sm text-gray-600 hover:text-primary-600 transition">Live</Link>
          )}
          {loaded && hasPermission('manage_courses') && (
            <Link href="/content-management" className="text-sm text-gray-600 hover:text-primary-600 transition">Content Management</Link>
          )}
          {loaded && hasPermission('manage_roles') && (
            <Link href="/roles" className="text-sm text-gray-600 hover:text-primary-600 transition">Roles</Link>
          )}
          {loaded && isSuperAdmin && (
            <Link href="/docs/flow" className="text-sm text-gray-600 hover:text-primary-600 transition">Flow Docs</Link>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">{userEmail}</span>
              <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 transition">Logout</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-gray-600 hover:text-primary-600 transition">Sign in</Link>
              <Link href="/signup" className="px-4 py-2 bg-primary-600 text-white text-sm rounded-full hover:bg-primary-700 transition">Get started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
