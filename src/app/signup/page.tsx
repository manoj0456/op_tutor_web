import { StudentSignupForm } from '@/components/shared/StudentSignupForm'

export const metadata = { title: 'Sign Up – OpTutor' }

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-10">
      <div className="w-full max-w-lg">
        <StudentSignupForm />
      </div>
    </div>
  )
}
