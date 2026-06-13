'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

const schema = z.object({
  roleRequest: z.enum(['TEACHER', 'STUDENT']),
})

type FormData = z.infer<typeof schema>

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export function RegisterForm() {
  const { user, userEmail, getIdToken } = useAuth()
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roleRequest: 'STUDENT' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      const token = await getIdToken()
      await fetch(`${API_URL}/role-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: userEmail, requestedRole: data.roleRequest }),
      })
      setDone(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request')
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-3">Request submitted</h2>
        <p className="text-gray-600 mb-6">
          A SUPER_ADMIN will review your role request and assign you access shortly.
        </p>
        <Link href="/" className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
          Go to home
        </Link>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-2xl font-bold mb-3">Sign in to get started</h2>
        <p className="text-gray-600 mb-6">
          OpTutor uses your <strong>oppertunitypool.com</strong> account. Log in with your
          existing credentials, then request a Teacher or Student role.
        </p>
        <Link
          href="/login"
          className="block w-full text-center px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition mb-4"
        >
          Sign in
        </Link>
        <p className="text-sm text-gray-500">
          {`Don't have an account? `}
          <a
            href="https://oppertunitypool.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline"
          >
            Create one at oppertunitypool.com
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-2 text-center">Request access</h1>
      <p className="text-sm text-gray-500 text-center mb-6">
        Signed in as <span className="font-medium text-gray-700">{userEmail}</span>
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">I want to join as...</label>
          <select
            {...register('roleRequest')}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher</option>
          </select>
          {errors.roleRequest && (
            <p className="text-red-500 text-sm mt-1">{errors.roleRequest.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition"
        >
          {isSubmitting ? 'Submitting...' : 'Request access'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href="/login" className="text-primary-600 hover:underline">Back to sign in</Link>
      </p>
    </div>
  )
}
