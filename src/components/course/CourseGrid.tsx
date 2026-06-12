'use client'
import { useQuery } from '@tanstack/react-query'
import { CourseCard } from './CourseCard'
import type { Course } from '@/types'

async function fetchCourses(): Promise<Course[]> {
  // TODO: replace with real API call
  return []
}

export function CourseGrid() {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
  })
  if (isLoading) return <div className="grid grid-cols-3 gap-6">{Array.from({length:6}).map((_,i) => <div key={i} className="bg-gray-100 rounded-xl aspect-video animate-pulse" />)}</div>
  if (!courses.length) return <p className="text-gray-400">No courses yet.</p>
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map(c => <CourseCard key={c.id} course={c} />)}
    </div>
  )
}
