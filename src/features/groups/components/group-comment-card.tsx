'use client'

import {
  Avatar as OnchainAvatar,
  Identity as OnchainIdentity,
  Name as OnchainName
} from '@coinbase/onchainkit/identity'
import { formatDistanceToNow } from 'date-fns'
import { Trash2 } from 'lucide-react'

import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import { useApiMutation } from '@/hooks/use-api-mutation'
import { useCurrentUser } from '@/hooks/use-current-user'

type GroupCommentCardProps = {
  comment: Doc<'comments'> & { author: Doc<'users'> }
}

export function GroupCommentCard({ comment }: GroupCommentCardProps) {
  const { currentUser, address } = useCurrentUser()
  const { mutate: removeComment, pending: isRemoving } = useApiMutation(
    api.comments.remove
  )

  const isAuthor = currentUser?._id === comment.authorId
  const timestamp = formatDistanceToNow(comment._creationTime, {
    addSuffix: true
  })
  const authorAddress = comment.author.walletAddress as `0x${string}`

  const handleRemove = () => {
    if (!address || isRemoving) return
    removeComment({ id: comment._id, address })
  }

  return (
    <div className='relative flex items-start gap-4'>
      {isAuthor && (
        <button
          type='button'
          onClick={handleRemove}
          className='absolute right-0 top-0 rounded-full p-1 text-muted-foreground transition hover:bg-muted'
          aria-label='Delete comment'
        >
          <Trash2 className='h-4 w-4' />
        </button>
      )}

      <OnchainIdentity address={authorAddress}>
        <OnchainAvatar className='h-10 w-10' />
        <OnchainName className='font-semibold' />
      </OnchainIdentity>

      <div className='flex-1 space-y-1'>
        <p className='text-xs text-muted-foreground'>{timestamp}</p>
        <p className='text-sm leading-relaxed text-foreground'>
          {comment.content}
        </p>
      </div>
    </div>
  )
}
