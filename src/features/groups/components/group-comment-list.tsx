'use client'

import { useEffect, useRef } from 'react'

import { useQuery } from 'convex/react'

import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'

import { GroupCommentCard } from './group-comment-card'
import { GroupCommentInput } from './group-comment-input'

type GroupCommentListProps = {
  post: Doc<'posts'> & {
    likes: Doc<'likes'>[]
    comments: Doc<'comments'>[]
    author: Doc<'users'>
  }
}

export function GroupCommentList({ post }: GroupCommentListProps) {
  const comments = (useQuery(api.comments.list, { postId: post._id }) ||
    []) as Array<Doc<'comments'> & { author: Doc<'users'> }>
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  return (
    <div className='flex flex-col gap-6'>
      <GroupCommentInput postId={post._id} />
      <ScrollArea className='max-h-64 rounded-lg border px-4 py-3'>
        <div className='flex flex-col gap-6'>
          {comments.map(comment => (
            <GroupCommentCard key={comment._id} comment={comment} />
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
