'use client'

import { Avatar as OnchainAvatar, Name as OnchainName, useName } from '@coinbase/onchainkit/identity'
import { format } from 'date-fns'
import { Calendar } from 'lucide-react'
import { base } from 'viem/chains'

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
  const { data: resolvedName } = useName(
    {
      address: walletAddress,
      chain: base
    },
    {
      enabled: !!walletAddress
    }
  )
  const basename = resolvedName ?? member.basename ?? null

  return (
    <article className='flex items-start gap-4 rounded-xl border border-border bg-card p-5'>
      <OnchainAvatar address={walletAddress} chain={base} className='h-14 w-14 rounded-full' />

      <div className='flex-1 space-y-2'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            {member.displayName ? (
              <p className='text-base font-bold text-foreground'>{member.displayName}</p>
            ) : (
              <OnchainName
                address={walletAddress}
                chain={base}
                className='text-base font-bold text-foreground'
              />
            )}
            {basename && (!member.displayName || basename !== member.displayName) && (
              <p className='text-sm text-muted-foreground'>@{basename}</p>
            )}
            {isOwner && (
              <span className='mt-1 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-foreground'>
                Owner
              </span>
            )}
          </div>
        </div>

        {member.about && (
          <p className='text-sm leading-relaxed text-foreground'>
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
