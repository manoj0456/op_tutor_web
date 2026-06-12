import { LiveSessionList } from '@/components/live/LiveSessionList'

export const metadata = { title: 'Live Classes – OpTutor' }

export default function LivePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Live Classes</h1>
      <p className="text-gray-500 mb-8">Join real-time sessions with expert teachers</p>
      <LiveSessionList />
    </div>
  )
}
