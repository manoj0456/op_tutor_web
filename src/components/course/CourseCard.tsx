import Image from 'next/image'
import Link from 'next/link'
import type { Course } from '@/types'

interface Props { course: Course }

export function CourseCard({ course }: Props) {
  return (
    <Link href={`/courses/${course.id}`} className="group block bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden">
      <div className="relative aspect-video bg-gray-100">
        {course.thumbnail && (
          <Image src={course.thumbnail} alt={course.title} fill className="object-cover" />
        )}
        <span className="absolute top-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded-full capitalize">
          {course.category}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 line-clamp-2">{course.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{course.teacher.name}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-400">{course.totalLessons} lessons · {course.totalDuration}m</span>
          <span className="font-bold text-primary-600">{course.isFree ? 'Free' : `$${course.price}`}</span>
        </div>
        <div className="flex items-center gap-1 mt-2">
          <span className="text-yellow-400 text-sm">★</span>
          <span className="text-sm font-medium">{course.rating.toFixed(1)}</span>
          <span className="text-sm text-gray-400">({course.enrolledCount})</span>
        </div>
      </div>
    </Link>
  )
}
