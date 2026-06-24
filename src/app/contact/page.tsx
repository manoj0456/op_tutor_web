'use client'

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-primary-900 via-primary-700 to-secondary-600 text-white py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-4">Contact Us</h1>
          <p className="text-xl text-primary-100">We&apos;d love to hear from you.</p>
        </div>
      </section>

      <section className="py-20 px-4 max-w-2xl mx-auto">
        <div className="grid md:grid-cols-2 gap-10 mb-14">
          {[
            { icon: '\u2709\ufe0f', title: 'Email', detail: 'support@optutor.com' },
            { icon: '\ud83d\udd50', title: 'Response time', detail: 'Within 24 hours' },
          ].map(({ icon, title, detail }) => (
            <div key={title} className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">{icon}</div>
              <div className="font-bold text-gray-900 mb-1">{title}</div>
              <div className="text-gray-500">{detail}</div>
            </div>
          ))}
        </div>

        <form className="space-y-5" onSubmit={e => e.preventDefault()}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input type="text" placeholder="Your name" required
              className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" placeholder="you@example.com" required
              className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea rows={5} placeholder="How can we help?" required
              className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
          </div>
          <button type="submit"
            className="w-full py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition">
            Send Message
          </button>
        </form>
      </section>
    </main>
  )
}
