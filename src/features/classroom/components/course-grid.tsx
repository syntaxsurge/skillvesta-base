'use client'

import { useQuery } from 'convex/react'
import { Plus } from 'lucide-react'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { useAppRouter } from '@/hooks/use-app-router'

import { CourseCard } from './course-card'

type CourseGridProps = {
  groupId: Id<'groups'>
  canCreate?: boolean
}

export function CourseGrid({ groupId, canCreate = false }: CourseGridProps) {
  const router = useAppRouter()
  type CourseDoc = Doc<'courses'> & { thumbnailUrl?: string }

  const courses = useQuery(api.courses.list, { groupId }) as
    | CourseDoc[]
    | undefined

  if (courses === undefined) {
    return <LoadingIndicator fullScreen />
  }

  const handleCreateCourse = () => {
    router.push(`/${groupId}/classroom/create`)
  }

  if (!courses.length && !canCreate) {
    return (
      <p className='text-sm text-muted-foreground'>
        The classroom is empty for now. Check back soon!
      </p>
    )
  }

  return (
    <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
      {canCreate && (
        <button
          type='button'
          onClick={handleCreateCourse}
          className='flex h-full min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card text-muted-foreground transition hover:bg-secondary/50'
        >
          <Plus className='h-8 w-8' />
          <span className='mt-2 text-sm font-semibold'>Create a course</span>
        </button>
      )}

      {courses.map(course => (
        <CourseCard key={course._id} groupId={groupId} course={course} />
      ))}
    </div>
  )
}
