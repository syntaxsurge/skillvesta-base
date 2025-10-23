'use client'

import {
  Avatar as OnchainAvatar,
  Identity as OnchainIdentity,
  Name as OnchainName
} from '@coinbase/onchainkit/identity'
import { format } from 'date-fns'
import { Calendar } from 'lucide-react'

import type { Doc } from '@/convex/_generated/dataModel'

import { useGroupContext } from '../context/group-context'

type GroupMemberCardProps = {
  member: Doc<'users'>
}

export function GroupMemberCard({ member }: GroupMemberCardProps) {
  const { group } = useGroupContext()
  const joinedAt = format(member._creationTime, 'MMM dd, yyyy')
  const isOwner = group.ownerId === member._id
  const walletAddress = member.walletAddress as `0x${string}`

  return (
    <article className='flex items-start gap-5 rounded-xl border border-border bg-card px-6 py-5'>
      <OnchainIdentity address={walletAddress}>
        <OnchainAvatar className='h-12 w-12' />
        <OnchainName className='text-base font-semibold' />
      </OnchainIdentity>

      <div className='space-y-3'>
        <div className='flex flex-wrap items-center gap-2'>
          <p className='text-sm font-medium text-foreground'>
            {member.displayName ?? member.walletAddress}
          </p>
          {isOwner && (
            <span className='rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
              Owner
            </span>
          )}
        </div>
        {member.about && (
          <p className='max-w-2xl text-sm text-muted-foreground'>
            {member.about}
          </p>
        )}
        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
          <Calendar className='h-3.5 w-3.5' />
          <span>Joined {joinedAt}</span>
        </div>
      </div>
    </article>
  )
}
