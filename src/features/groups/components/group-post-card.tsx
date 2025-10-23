'use client'

import {
  Avatar as OnchainAvatar,
  Identity as OnchainIdentity,
  Name as OnchainName
} from '@coinbase/onchainkit/identity'
import { formatDistanceToNow } from 'date-fns'
import { ThumbsUp, Trash2 } from 'lucide-react'

import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import { useApiMutation } from '@/hooks/use-api-mutation'
import { useCurrentUser } from '@/hooks/use-current-user'
import { cn } from '@/lib/utils'

import { GroupPostContentEditor } from './post-content-editor'

type GroupPostCardProps = {
  post: Doc<'posts'> & {
    likes: Doc<'likes'>[]
    comments: Doc<'comments'>[]
    author: Doc<'users'>
  }
  className?: string
}

export function GroupPostCard({ post, className }: GroupPostCardProps) {
  const { currentUser, address } = useCurrentUser()

  const { mutate: likePost, pending: isLiking } = useApiMutation(api.likes.add)
  const { mutate: removePost, pending: isRemoving } = useApiMutation(
    api.posts.remove
  )

  const isOwner = currentUser?._id === post.author._id

  const authorAddress = post.author.walletAddress as `0x${string}`

  return (
    <article
      className={cn(
        'relative space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm',
        className
      )}
    >
      {isOwner && (
        <button
          type='button'
          onClick={() => {
            if (!address || isRemoving) return
            removePost({ id: post._id, address })
          }}
          className='absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted'
          aria-label='Delete post'
        >
          <Trash2 className='h-4 w-4' />
        </button>
      )}

      <div className='flex items-center gap-3'>
        <OnchainIdentity address={authorAddress}>
          <OnchainAvatar className='h-12 w-12' />
          <div className='flex flex-col'>
            <OnchainName className='text-base font-semibold' />
            <span className='text-xs text-muted-foreground'>
              {formatDistanceToNow(post._creationTime, { addSuffix: true })}
            </span>
          </div>
        </OnchainIdentity>
      </div>

      <div>
        <h2 className='text-xl font-semibold text-foreground'>{post.title}</h2>
        <GroupPostContentEditor
          postId={post._id}
          initialContent={post.content}
          editable={isOwner}
          className='mt-4'
        />
      </div>

      <div className='flex items-center gap-6 text-sm text-muted-foreground'>
        <button
          type='button'
          className='flex items-center gap-2 rounded-full border border-transparent px-3 py-1 transition hover:border-border hover:text-foreground'
          onClick={() => {
            if (!address || isLiking) return
            likePost({ postId: post._id, address })
          }}
          disabled={!address || isLiking}
        >
          <ThumbsUp className='h-4 w-4' />
          <span>{post.likes.length}</span>
        </button>

        <span>{post.comments.length} comments</span>
      </div>
    </article>
  )
}
