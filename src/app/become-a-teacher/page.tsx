import Link from 'next/link'

export const metadata = { title: 'Become a Teacher — OpTutor' }

const perks = [
  { icon: '🌍', title: 'Reach thousands of students', desc: 'Publish live classes and recorded courses to our growing global community.' },
  { icon: '💰', title: 'Earn from your expertise', desc: 'Set your own rates and get paid for every session you teach.' },
  { icon: '🛠️', title: 'Powerful teaching tools', desc: 'Use our visual aids, screen sharing, and quiz tools to deliver unforgettable lessons.' },
  { icon: '📅', title: 'Teach on your schedule', desc: 'You decide when and how often you teach — full flexibility, no minimums.' },
]

export default function BecomeATeacherPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-primary-900 via-primary-700 to-secondary-600 text-white py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-4">Become a Teacher</h1>
          <p className="text-xl text-primary-100 mb-8">
            Share your knowledge, grow your audience, and earn doing what you love.
          </p>
          <Link href="/signup"
            className="inline-block px-10 py-4 bg-yellow-400 text-gray-900 rounded-full font-bold text-lg hover:bg-yellow-300 transition shadow-lg">
            Apply to Teach
          </Link>
        </div>
      </section>

      <section className="py-20 px-4 max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why teach on OpTutor?</h2>
        <div className="grid md:grid-cols-2 gap-8 mb-14">
          {perks.map(({ icon, title, desc }) => (
            <div key={title} className="bg-gray-50 rounded-2xl p-8 flex gap-5">
              <div className="text-4xl flex-shrink-0">{icon}</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/signup"
            className="px-10 py-4 bg-primary-600 text-white rounded-full font-bold text-lg hover:bg-primary-700 transition">
            Get Started — It&apos;s Free
          </Link>
          <p className="mt-4 text-gray-400 text-sm">Questions? <Link href="/contact" className="text-primary-600 hover:underline">Contact us</Link></p>
        </div>
      </section>
    </main>
  )
}
