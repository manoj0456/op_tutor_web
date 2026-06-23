import Link from 'next/link'

export const metadata = { title: 'About Us — OpTutor' }

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-primary-900 via-primary-700 to-secondary-600 text-white py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-4">About OpTutor</h1>
          <p className="text-xl text-primary-100">
            Future-ready learning for kids and adults — building skills AI cannot replace.
          </p>
        </div>
      </section>

      <section className="py-20 px-4 max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
        <p className="text-gray-600 text-lg leading-relaxed mb-6">
          OpTutor was built on a simple belief: the best human skills — creativity, critical thinking,
          collaboration, and hands-on expertise — will always matter. Our platform connects expert
          teachers with curious learners through live classes, recorded courses, and visual learning
          tools across Technology, Math, Science, Arts, and more.
        </p>
        <p className="text-gray-600 text-lg leading-relaxed mb-10">
          Whether you are a student starting out or a professional levelling up, OpTutor gives you
          the community, curriculum, and live interaction you need to thrive in an AI-driven world.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-14">
          {[
            { stat: '10,000+', label: 'Active Students' },
            { stat: '500+',    label: 'Expert Teachers' },
            { stat: '200+',    label: 'Live Courses' },
          ].map(({ stat, label }) => (
            <div key={label} className="text-center bg-primary-50 rounded-2xl p-8">
              <div className="text-4xl font-extrabold text-primary-600 mb-2">{stat}</div>
              <div className="text-gray-600 font-medium">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Link href="/courses" className="px-8 py-3 bg-primary-600 text-white rounded-full font-bold hover:bg-primary-700 transition">
            Browse Courses
          </Link>
          <Link href="/contact" className="px-8 py-3 border-2 border-primary-600 text-primary-600 rounded-full font-bold hover:bg-primary-50 transition">
            Contact Us
          </Link>
        </div>
      </section>
    </main>
  )
}
