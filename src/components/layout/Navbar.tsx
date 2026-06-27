'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { usePermissions } from '@/context/PermissionContext'

export function Navbar() {
  const { user, userEmail, signOut } = useAuth()
  const { hasPermission, loaded, isSuperAdmin } = usePermissions()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    signOut()
    router.push('/login')
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const avatarLetter = userEmail ? userEmail.charAt(0).toUpperCase() : '?'

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-14 md:h-20 flex items-center justify-between">
        <Link href="/"><img src="/logos/logo-brand.png" alt="OpTutor" className="h-8 md:h-14 w-auto max-w-[60vw] object-contain" /></Link>
        <div className="flex items-center gap-3 md:gap-6">
          {(!loaded || hasPermission('view_courses')) && (
            <Link href="/courses" className="text-sm text-gray-600 hover:text-primary-600 transition">Courses</Link>
          )}
          {(!loaded || hasPermission('view_live')) && (
            <Link href="/live" className="text-sm text-gray-600 hover:text-primary-600 transition">Live</Link>
          )}

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(prev => !prev)}
                className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold hover:bg-primary-700 transition focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
              >
                {avatarLetter}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  {loaded && hasPermission('manage_roles') && (
                    <Link
                      href="/roles"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      Roles
                    </Link>
                  )}
                  {loaded && hasPermission('manage_courses') && (
                    <Link
                      href="/content-management"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      Content Management
                    </Link>
                  )}
                  {loaded && isSuperAdmin && (
                    <Link
                      href="/docs/flow"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                    >
                      Flow Docs
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition"
                  >
                    Logout
                  </button>
                </div>
              )}
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
