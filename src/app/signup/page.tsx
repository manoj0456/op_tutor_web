import { RegisterForm } from '@/components/shared/RegisterForm'

export const metadata = { title: 'Request Access – OpTutor' }

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  )
}
