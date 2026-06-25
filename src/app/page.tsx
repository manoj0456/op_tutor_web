'use client'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

const stats = [
  { value: '10,000+', label: 'Active Students' },
  { value: '500+', label: 'Expert Teachers' },
  { value: '200+', label: 'Live Courses' },
  { value: '50+', label: 'Subject Areas' },
]

const features = [
  {
    icon: '🎥',
    title: 'Live Interactive Classes',
    desc: 'Join real-time sessions with expert teachers. Multiple students, one classroom — ask questions, get instant feedback, and learn together.',
  },
  {
    icon: '📚',
    title: 'Pre-Recorded Courses',
    desc: 'Learn at your own pace with structured video courses, quizzes, and hands-on exercises available 24/7 from any device.',
  },
  {
    icon: '🔁',
    title: 'Sessions Recorded & Saved',
    desc: 'Every live class is recorded and stored so you can re-watch lessons, catch up on missed sessions, or review key concepts anytime.',
  },
  {
    icon: '🧠',
    title: 'Visual Learning Tools',
    desc: 'As teachers explain topics, smart visual aids highlight exactly what they are talking about — making complex ideas easy to grasp.',
  },
  {
    icon: '📱',
    title: 'App & Web Access',
    desc: 'Learn from anywhere — our platform works seamlessly on web browsers and our mobile app, so your classroom is always in your pocket.',
  },
  {
    icon: '🗺️',
    title: 'Structured Curriculum',
    desc: 'Each subject comes with a carefully built curriculum — from beginner to advanced — so you always know where you are and what comes next.',
  },
]

const categories = [
  { emoji: '💻', name: 'Technology & AI', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { emoji: '➗', name: 'Mathematics', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { emoji: '🔬', name: 'Science', color: 'bg-green-50 text-green-700 border-green-200' },
  { emoji: '⚛️', name: 'Physics', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { emoji: '🧬', name: 'Biology', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { emoji: '🎨', name: 'Arts & Design', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { emoji: '⚽', name: 'Sports Science', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { emoji: '🤖', name: 'Coding & Robotics', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
]

const steps = [
  { num: '01', title: 'Create your free account', desc: 'Sign up in seconds — no credit card required. Choose whether you are a student or teacher.' },
  { num: '02', title: 'Pick your subjects', desc: 'Browse 200+ courses and live classes across technology, science, arts and more.' },
  { num: '03', title: 'Start learning today', desc: 'Join a live class or start a course immediately. Track progress and earn certificates.' },
]

const testimonials = [
  { name: 'Aisha K.', role: 'Student, Age 16', avatar: 'AK', text: 'The live classes feel like a real classroom. My teacher explains coding with visual diagrams that make everything click instantly.' },
  { name: 'Marcus T.', role: 'Parent', avatar: 'MT', text: 'My son went from struggling in math to loving it. The recorded sessions mean he can re-watch lessons as many times as he needs.' },
  { name: 'Dr. Priya S.', role: 'Biology Teacher', avatar: 'PS', text: 'The visual teaching tools help me show students exactly what I am explaining in real time. Engagement is through the roof.' },
]

function LoggedInHome() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-16 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-10">Welcome back</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <Link
            href="/live"
            className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-3xl mb-5 group-hover:bg-primary-200 transition">
              🎥
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Live Sessions</h2>
            <p className="text-gray-500 text-sm">Join real-time interactive classes with expert teachers</p>
          </Link>
          <Link
            href="/courses"
            className="group bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 rounded-full bg-secondary-100 text-secondary-600 flex items-center justify-center text-3xl mb-5 group-hover:bg-secondary-200 transition">
              📚
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Courses</h2>
            <p className="text-gray-500 text-sm">Browse and learn from structured video courses at your own pace</p>
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function HomePage() {
  const { user } = useAuth()

  if (user) return <LoggedInHome />

  return (
    <main className="min-h-screen bg-white">

      {/* -- HERO -- */}
      <section className="bg-gradient-to-br from-primary-900 via-primary-700 to-secondary-600 text-white py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-block bg-white/20 text-white text-sm font-medium px-4 py-1 rounded-full mb-6">
            🚀 Future-Proof Your Skills
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6">
            Learn Skills That AI<br />
            <span className="text-yellow-300">Cannot Replace</span>
          </h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-10">
            Live classes, recorded courses, and hands-on exercises in Technology, Math, Science, Arts & more —
            taught by real experts, built for kids and adults ready to thrive in an AI-driven world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-yellow-400 text-gray-900 rounded-full font-bold text-lg hover:bg-yellow-300 transition shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              href="/courses"
              className="px-8 py-4 border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white/10 transition"
            >
              Browse Courses
            </Link>
          </div>
          <p className="mt-6 text-primary-200 text-sm">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* -- STATS -- */}
      <section className="bg-primary-800 text-white py-10 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-extrabold text-yellow-300">{s.value}</div>
              <div className="text-primary-200 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* -- FEATURES -- */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need to Learn & Teach</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              One platform for students and teachers — live, recorded, visual, and structured.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-7 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- CATEGORIES -- */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Explore Subject Areas</h2>
            <p className="text-gray-500 text-lg">From cutting-edge tech to creative arts — we cover it all.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((c) => (
              <Link
                key={c.name}
                href="/courses"
                className={`flex items-center gap-3 px-5 py-4 rounded-xl border font-medium text-sm hover:scale-105 transition-transform ${c.color}`}
              >
                <span className="text-2xl">{c.emoji}</span>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* -- HOW IT WORKS -- */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Start Learning in 3 Simple Steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-600 text-white text-xl font-extrabold mb-5">
                  {s.num}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- TESTIMONIALS -- */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Community Says</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-7 border border-gray-100">
                <p className="text-gray-600 text-sm leading-relaxed mb-6">&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-gray-400 text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -- CTA -- */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-900 via-primary-700 to-secondary-600 text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-extrabold mb-4">Ready to Future-Proof Your Skills?</h2>
          <p className="text-primary-200 text-lg mb-10">
            Join thousands of students and teachers already building AI-proof knowledge on OpTutor.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-10 py-4 bg-yellow-400 text-gray-900 rounded-full font-bold text-lg hover:bg-yellow-300 transition shadow-lg"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="px-10 py-4 border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white/10 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* -- FOOTER -- */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-10">
          <div>
            <div className="text-white text-xl font-extrabold mb-3">OpTutor</div>
            <p className="text-sm leading-relaxed">Future-ready learning for kids and adults — building skills AI cannot replace.</p>
          </div>
          <div>
            <div className="text-white font-semibold mb-3">Learn</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/courses" className="hover:text-white transition">All Courses</Link></li>
              <li><Link href="/live" className="hover:text-white transition">Live Classes</Link></li>
              <li><Link href="/courses" className="hover:text-white transition">Recorded Sessions</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-white font-semibold mb-3">Company</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="/become-a-teacher" className="hover:text-white transition">Become a Teacher</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-white font-semibold mb-3">Account</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register" className="hover:text-white transition">Sign Up Free</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Sign In</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-8 border-t border-gray-800 text-center text-xs text-gray-500">
          &copy; 2026 OpTutor &middot; tutor.opportunitypool.com &middot; All rights reserved.
        </div>
      </footer>

    </main>
  )
}
