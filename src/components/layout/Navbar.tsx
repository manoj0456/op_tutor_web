'use client'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'

export function Navbar() {
  const { user, logout } = useAuthStore()
  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-primary-600">OpTutor</Link>
        <div className="flex items-center gap-6">
          <Link href="/courses" className="text-sm text-gray-600 hover:text-primary-600 transition">Courses</Link>
          <Link href="/live" className="text-sm text-gray-600 hover:text-primary-600 transition">Live</Link>
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm font-medium text-gray-700">{user.name}</Link>
              <button onClick={logout} className="text-sm text-gray-500 hover:text-red-500 transition">Logout</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-gray-600 hover:text-primary-600 transition">Sign in</Link>
              <Link href="/register" className="px-4 py-2 bg-primary-600 text-white text-sm rounded-full hover:bg-primary-700 transition">Get started</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
