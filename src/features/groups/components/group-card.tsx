'use client'

import { useRouter } from 'next/navigation'

import type { Doc } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'

type GroupCardProps = {
  group: Doc<'groups'>
  className?: string
}

export function GroupCard({ group, className }: GroupCardProps) {
  const router = useRouter()
  const memberLabel = group.memberNumber === 1 ? 'member' : 'members'

  return (
    <button
      type='button'
      onClick={() => router.push(`/${group._id}`)}
      className={cn(
        'flex h-full w-full flex-col rounded-xl border border-border bg-card p-5 text-start transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <span className='text-sm font-medium text-muted-foreground'>
        {group.memberNumber} {memberLabel}
      </span>
      <h3 className='mt-2 text-lg font-semibold text-foreground'>
        {group.name}
      </h3>
      <p className='mt-3 line-clamp-4 text-sm text-muted-foreground'>
        {group.description}
      </p>
    </button>
  )
}
