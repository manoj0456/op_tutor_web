import { Suspense } from 'react'
import { CourseGrid } from '@/components/course/CourseGrid'
import { CourseFilters } from '@/components/course/CourseFilters'

export const metadata = { title: 'Courses – OpTutor' }

export default function CoursesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">All Courses</h1>
      <p className="text-gray-500 mb-8">Expand your skills with expert-led content</p>
      <div className="flex gap-8">
        <aside className="w-64 shrink-0">
          <CourseFilters />
        </aside>
        <main className="flex-1">
          <Suspense fallback={<div>Loading courses...</div>}>
            <CourseGrid />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
