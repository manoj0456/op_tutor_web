'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

const schema = z.object({
  name:            z.string().min(2, 'Name too short'),
  email:           z.string().email('Invalid email'),
  password:        z.string()
    .min(8, 'Min 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  confirmPassword: z.string(),
  roleRequest:     z.enum(['TEACHER', 'STUDENT']),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export function RegisterForm() {
  const { signUp } = useAuth()
  const [done, setDone] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { roleRequest: 'STUDENT' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await signUp(data.email, data.password, data.name)
      if (API_URL) {
        fetch(`${API_URL}/role-requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, name: data.name, requestedRole: data.roleRequest }),
        }).catch(() => {})
      }
      setDone(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sign-up failed')
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">📧</div>
        <h2 className="text-2xl font-bold mb-3">Check your email</h2>
        <p className="text-gray-600 mb-6">
          We sent a verification link to your email. Click it to activate your account, then sign in.
        </p>
        <p className="text-sm text-gray-500">
          After verifying, a SUPER_ADMIN will assign your role before you can access restricted content.
        </p>
        <Link href="/login" className="mt-6 inline-block px-6 py-2 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition">
          Go to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Create account</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input {...register('name')} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input {...register('email')} type="email" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input {...register('password')} type="password" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Confirm password</label>
          <input {...register('confirmPassword')} type="password" className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">I want to join as...</label>
          <select {...register('roleRequest')} className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="STUDENT">Student</option>
            <option value="TEACHER">Teacher</option>
          </select>
        </div>
        <button type="submit" disabled={isSubmitting}
          className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Already have one?{' '}
        <Link href="/login" className="text-primary-600 hover:underline">Sign in</Link>
      </p>
    </div>
  )
}