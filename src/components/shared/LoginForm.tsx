'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
})
type FormData = z.infer<typeof schema>

export function LoginForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const onSubmit = async (data: FormData) => {
    // TODO: call signIn from next-auth
    console.log(data)
  }
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Welcome back</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        No account? <Link href="/register" className="text-primary-600 hover:underline">Sign up</Link>
      </p>
    </div>
  )
}
