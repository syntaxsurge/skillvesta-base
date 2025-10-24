'use client'

import Image from 'next/image'

import { BookOpen, ChevronRight } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { useAppRouter } from '@/hooks/use-app-router'
import { useResolvedMediaUrl } from '@/hooks/use-resolved-media-url'

type CourseCardProps = {
  groupId: Id<'groups'>
  course: Doc<'courses'> & { thumbnailUrl?: string }
}

export function CourseCard({ groupId, course }: CourseCardProps) {
  const router = useAppRouter()
  const { url: thumbnailUrl, loading } = useResolvedMediaUrl(
    course.thumbnailUrl
  )

  return (
    <article className='flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-lg'>
      <div className='relative h-40 bg-muted'>
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={course.title}
            fill
            className='object-cover'
            sizes='(max-width: 768px) 100vw, 360px'
          />
        ) : loading ? (
          <Skeleton className='h-full w-full rounded-none' />
        ) : (
          <div className='flex h-full w-full items-center justify-center'>
            <BookOpen className='h-10 w-10 text-muted-foreground' />
          </div>
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
