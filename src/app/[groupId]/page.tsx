'use client'

import { useQuery } from 'convex/react'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import { GroupPostComposer } from '@/features/groups/components/group-post-composer'
import { GroupPostThread } from '@/features/groups/components/group-post-thread'
import { GroupSidebar } from '@/features/groups/components/group-sidebar'
import { useGroupContext } from '@/features/groups/context/group-context'

type GroupFeedPageProps = {
  params: Promise<{
    groupId: string
  }>
}

export default function GroupFeedPage(_: GroupFeedPageProps) {
  const { group } = useGroupContext()
  type PostWithRelations = Doc<'posts'> & {
    likes: Doc<'likes'>[]
    comments: Doc<'comments'>[]
    author: Doc<'users'>
  }

  const posts = useQuery(api.posts.list, {
    groupId: group._id
  }) as PostWithRelations[] | undefined

  if (posts === undefined) {
    return <LoadingIndicator fullScreen />
  }

  return (
    <div className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]'>
      <div className='space-y-6'>
        <GroupPostComposer groupId={group._id} />

        <div className='space-y-6'>
          {posts.map(post => (
            <GroupPostThread key={post._id} post={post} />
          ))}
        </div>
      </div>

      <GroupSidebar />
    </div>
  )
}
