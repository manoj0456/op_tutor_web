import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-secondary-600">
      <div className="container mx-auto px-4 py-16 text-center text-white">
        <h1 className="text-5xl font-bold mb-6">
          Future-Ready Learning
        </h1>
        <p className="text-xl mb-4 text-primary-100 max-w-2xl mx-auto">
          AI-proof skills in Technology, Math, Science, Arts & more.
          Live classes, recorded courses, and hands-on exercises.
        </p>
        <div className="flex gap-4 justify-center mt-10">
          <Link
            href="/courses"
            className="px-8 py-3 bg-white text-primary-700 rounded-full font-semibold hover:bg-primary-50 transition"
          >
            Browse Courses
          </Link>
          <Link
            href="/live"
            className="px-8 py-3 border border-white text-white rounded-full font-semibold hover:bg-white/10 transition"
          >
            Join Live Class
          </Link>
        </div>
      </div>
    </main>
  )
}
