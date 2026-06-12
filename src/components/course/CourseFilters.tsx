'use client'
import type { CourseCategory, CourseLevel } from '@/types'

const CATEGORIES: CourseCategory[] = ['technology','math','science','physics','biology','arts','sports','ai','other']
const LEVELS: CourseLevel[] = ['beginner','intermediate','advanced']

export function CourseFilters() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Category</h3>
        <div className="space-y-2">
          {CATEGORIES.map(cat => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-primary-600" />
              <span className="capitalize text-sm">{cat}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-3">Level</h3>
        <div className="space-y-2">
          {LEVELS.map(lvl => (
            <label key={lvl} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-primary-600" />
              <span className="capitalize text-sm">{lvl}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-3">Price</h3>
        <div className="space-y-2">
          {['Free','Paid'].map(p => (
            <label key={p} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded text-primary-600" />
              <span className="text-sm">{p}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
