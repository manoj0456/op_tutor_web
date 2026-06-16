'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import type { CognitoUser } from 'amazon-cognito-identity-js'
import { useAuth } from '@/context/AuthContext'

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
})
type FormData = z.infer<typeof schema>

export function LoginForm() {
  const { signIn, forgotPassword, confirmForgotPassword, completeNewPassword } = useAuth()
  const router = useRouter()
  const [showForgot, setShowForgot] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode]   = useState('')
  const [newPwd, setNewPwd]         = useState('')
  const [resetting, setResetting]   = useState(false)
  const [newPwdChallenge, setNewPwdChallenge] = useState<{ cognitoUser: CognitoUser } | null>(null)
  const [challengeNewPwd, setChallengeNewPwd]     = useState('')
  const [challengeConfirm, setChallengeConfirm]   = useState('')
  const [challengeSubmitting, setChallengeSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const result = await signIn(data.email, data.password) as any
      if (result && result.newPasswordRequired) {
        setNewPwdChallenge({ cognitoUser: result.cognitoUser })
        return
      }
      toast.success('Signed in!')
      router.push('/')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sign-in failed')
    }
  }

  const handleCompleteNewPassword = async () => {
    if (!newPwdChallenge) return
    if (challengeNewPwd.length < 8) { toast.error('Password must be at least 8 characters'); return }
    if (challengeNewPwd !== challengeConfirm) { toast.error('Passwords do not match'); return }
    setChallengeSubmitting(true)
    try {
      await completeNewPassword(newPwdChallenge.cognitoUser, challengeNewPwd)
      toast.success('Password set! You are now signed in.')
      router.push('/')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to set password')
    } finally {
      setChallengeSubmitting(false)
    }
  }

  const handleForgot = async () => {
    if (!forgotEmail) { toast.error('Enter your email first'); return }
    try {
      await forgotPassword(forgotEmail)
      setForgotSent(true)
      toast.success('Check your email for a reset code')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset code')
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      await confirmForgotPassword(forgotEmail, resetCode, newPwd)
      toast.success('Password reset! Please sign in.')
      setShowForgot(false)
      setForgotSent(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setResetting(false)
    }
  }

  if (newPwdChallenge) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2 text-center">Set a new password</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Your account requires a new password before you can continue.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <input type="password" value={challengeNewPwd} onChange={e => setChallengeNewPwd(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm new password</label>
            <input type="password" value={challengeConfirm} onChange={e => setChallengeConfirm(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onKeyDown={e => { if (e.key === 'Enter') handleCompleteNewPassword() }} />
          </div>
          <button onClick={handleCompleteNewPassword} disabled={challengeSubmitting}
            className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
            {challengeSubmitting ? 'Saving...' : 'Set new password'}
          </button>
        </div>
      </div>
    )
  }

  if (showForgot) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Reset password</h1>
        {!forgotSent ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <button onClick={handleForgot} className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 transition">
              Send reset code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Reset code (from email)</label>
              <input value={resetCode} onChange={e => setResetCode(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New password</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <button onClick={handleReset} disabled={resetting}
              className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
              {resetting ? 'Resetting...' : 'Set new password'}
            </button>
          </div>
        )}
        <button onClick={() => setShowForgot(false)} className="mt-4 text-sm text-gray-500 hover:text-primary-600 w-full text-center">
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Welcome back</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input {...register('email')} type="email"
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input {...register('password')} type="password"
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
        </div>
        <div className="text-right">
          <button type="button" onClick={() => setShowForgot(true)} className="text-sm text-primary-600 hover:underline">
            Forgot password?
          </button>
        </div>
        <button type="submit" disabled={isSubmitting}
          className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        No account?{' '}
        <Link href="/signup" className="text-primary-600 hover:underline">Sign up</Link>
      </p>
    </div>
  )
}