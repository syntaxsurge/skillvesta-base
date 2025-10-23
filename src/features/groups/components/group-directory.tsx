'use client'

import { useRouter } from 'next/navigation'

import { useQuery } from 'convex/react'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'

import { GroupCard } from './group-card'

export function GroupDirectory() {
  const router = useRouter()
  const groups = useQuery(api.groups.listAll, {}) as
    | Array<Doc<'groups'>>
    | undefined

  if (groups === undefined) {
    return <LoadingIndicator fullScreen />
  }

  if (!groups.length) {
    return (
      <div className='flex h-full flex-col items-center justify-center space-y-4 py-16'>
        <p className='text-sm text-muted-foreground'>
          You haven&apos;t created any groups yet.
        </p>
        <Button onClick={() => router.push('/create')}>Create a group</Button>
      </div>
    )
  }

  return (
    <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
      {groups.map(group => (
        <GroupCard key={group._id} group={group} />
      ))}
    </div>
  )
}
