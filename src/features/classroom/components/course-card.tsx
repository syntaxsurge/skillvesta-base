'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { ChevronRight } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import type { Doc, Id } from '@/convex/_generated/dataModel'

type CourseCardProps = {
  groupId: Id<'groups'>
  course: Doc<'courses'> & { thumbnailStorageId?: string }
}

export function CourseCard({ groupId, course }: CourseCardProps) {
  const router = useRouter()

  return (
    <article className='flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg'>
      <div className='relative h-40 bg-muted'>
        {course.thumbnailStorageId ? (
          <Image
            src={course.thumbnailStorageId}
            alt={course.title}
            fill
            className='object-cover'
            sizes='(max-width: 768px) 100vw, 360px'
          />
        ) : (
          <Skeleton className='h-full w-full rounded-none' />
        )}
      </div>

      <div className='flex flex-1 flex-col gap-3 p-5'>
        <div>
          <h3 className='text-lg font-semibold text-foreground'>
            {course.title}
          </h3>
          <p className='mt-1 line-clamp-3 text-sm text-muted-foreground'>
            {course.description}
          </p>
        </div>

        <button
          type='button'
          onClick={() => router.push(`/${groupId}/classroom/${course._id}`)}
          className='mt-auto inline-flex items-center gap-2 self-start text-sm font-medium text-primary transition hover:underline'
        >
          Open course
          <ChevronRight className='h-4 w-4' />
        </button>
      </div>
    </article>
  )
}
