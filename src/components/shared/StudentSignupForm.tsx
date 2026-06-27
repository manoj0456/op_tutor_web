'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface ProfileDraft {
  userSub: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  profilePictureDataUrl: string
  cardLastFour: string
  cardHolderName: string
  cardExpiry: string
  paymentMethodAdded: boolean
}

const inputCls = 'w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

function maskCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 4) return digits
  return '•'.repeat(digits.length - 4) + digits.slice(-4)
}

export function StudentSignupForm() {
  const { signUp, confirmSignUp, resendConfirmationCode } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [submitting, setSubmitting] = useState(false)

  // ── Form fields ──
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [profilePicDataUrl, setProfilePicDataUrl] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Payment (collect only, never store full card) ──
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardNumberRaw, setCardNumberRaw] = useState('')
  const [cardNumberMasked, setCardNumberMasked] = useState('')
  const [cardFocused, setCardFocused] = useState(false)
  const [expMonth, setExpMonth] = useState('')
  const [expYear, setExpYear] = useState('')

  // ── Verification ──
  const [otp, setOtp] = useState('')
  const [draft, setDraft] = useState<ProfileDraft | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > 4 * 1024 * 1024) { toast.error('Image must be under 4MB'); return }
    const reader = new FileReader()
    reader.onload = () => setProfilePicDataUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Full name is required'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Enter a valid email'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (password !== confirmPwd) return 'Passwords do not match'
    if (!phone.trim()) return 'Phone number is required'
    if (!dateOfBirth) return 'Date of birth is required'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { toast.error(err); return }
    setSubmitting(true)
    try {
      const phoneE164 = phone.trim().startsWith('+') ? phone.trim() : phone.trim()
      const result = await signUp(email.trim(), password, fullName.trim(), {
        phone_number: phoneE164.replace(/[^\d+]/g, ''),
        birthdate: dateOfBirth,
      })
      const cardDigits = cardNumberRaw.replace(/\D/g, '')
      setDraft({
        userSub: result.userSub,
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth,
        profilePictureDataUrl: profilePicDataUrl,
        cardLastFour: cardDigits.slice(-4),
        cardHolderName: cardHolderName.trim(),
        cardExpiry: expMonth && expYear ? `${expMonth.padStart(2, '0')}/${expYear}` : '',
        paymentMethodAdded: cardDigits.length >= 12 && !!cardHolderName.trim(),
      })
      toast.success('Account created. Check your email for a verification code.')
      setStep('verify')
    } catch (e: unknown) {
      // Cognito may require phone_number in E.164; retry without optional attrs if it fails
      toast.error(e instanceof Error ? e.message : 'Sign-up failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft) return
    if (!otp.trim()) { toast.error('Enter the verification code'); return }
    setSubmitting(true)
    try {
      await confirmSignUp(draft.email, otp.trim())
      // Store profile in DynamoDB (no auth token yet — endpoint is public for self-registration)
      try {
        await fetch(`${API_URL}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: draft.userSub,
            email: draft.email,
            fullName: draft.fullName,
            phone: draft.phone,
            dateOfBirth: draft.dateOfBirth,
            profilePictureDataUrl: draft.profilePictureDataUrl || undefined,
            paymentMethodAdded: draft.paymentMethodAdded,
            cardLastFour: draft.cardLastFour,
            cardHolderName: draft.cardHolderName,
            cardExpiry: draft.cardExpiry,
          }),
        })
      } catch {
        // Non-fatal: account verified even if profile store fails
      }
      toast.success('Email verified! Welcome to OpTutor.')
      router.push('/courses')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!draft) return
    try {
      await resendConfirmationCode(draft.email)
      toast.success('A new code has been sent to your email')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not resend code')
    }
  }

  if (step === 'verify') {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2 text-center">Verify your email</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          We sent a 6-digit code to <span className="font-medium text-gray-700">{draft?.email}</span>
        </p>
        <form onSubmit={handleVerify} className="space-y-4">
          <input
            className={inputCls + ' text-center tracking-[0.4em] text-lg'}
            placeholder="------"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" disabled={submitting}
            className="w-full bg-primary-600 text-white py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
            {submitting ? 'Verifying...' : 'Verify & continue'}
          </button>
        </form>
        <button onClick={handleResend} className="mt-4 text-sm text-primary-600 hover:underline w-full text-center">
          Resend code
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h1 className="text-2xl font-bold mb-1 text-center">Create your account</h1>
      <p className="text-sm text-gray-500 text-center mb-6">Join OpTutor as a student</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email address</label>
          <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm password</label>
            <input className={inputCls} type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone number</label>
            <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 123 4567" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of birth</label>
            <input className={inputCls} type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Profile picture</label>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
              {profilePicDataUrl
                ? <img src={profilePicDataUrl} alt="" className="w-full h-full max-w-full object-cover" />
                : <span className="text-gray-300 text-xl">👤</span>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="text-sm" />
          </div>
        </div>

        {/* Payment details */}
        <div className="border-t pt-4 mt-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Payment details</h2>
          <p className="text-xs text-gray-400 mb-3">Payment will be charged when courses go live for purchase. We only store the last 4 digits of your card.</p>
          <div className="space-y-3">
            <input className={inputCls} placeholder="Cardholder name" value={cardHolderName} onChange={e => setCardHolderName(e.target.value)} />
            <input
              className={inputCls}
              placeholder="Card number"
              inputMode="numeric"
              value={cardFocused ? cardNumberRaw : (cardNumberMasked || cardNumberRaw)}
              onFocus={() => setCardFocused(true)}
              onBlur={() => { setCardFocused(false); setCardNumberMasked(maskCardNumber(cardNumberRaw)) }}
              onChange={e => { const v = e.target.value.replace(/[^\d ]/g, ''); setCardNumberRaw(v) }}
            />
            <div className="grid grid-cols-2 gap-4">
              <input className={inputCls} placeholder="Exp. month (MM)" inputMode="numeric" maxLength={2}
                value={expMonth} onChange={e => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))} />
              <input className={inputCls} placeholder="Exp. year (YYYY)" inputMode="numeric" maxLength={4}
                value={expYear} onChange={e => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition">
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-primary-600 hover:underline">Login</Link>
      </p>
    </div>
  )
}
