'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { Users } from 'lucide-react'

import type { Doc } from '@/convex/_generated/dataModel'
import { cn } from '@/lib/utils'
import { formatGroupPriceLabel } from '../utils/price'

type GroupCardProps = {
  group: Doc<'groups'>
  owner: Doc<'users'> | null
  memberCount: number
  className?: string
}

function formatOwnerLabel(owner: Doc<'users'> | null) {
  if (!owner) return 'Unknown creator'
  return (
    owner.displayName ??
    owner.basename ??
    (owner.walletAddress
      ? `${owner.walletAddress.slice(0, 6)}...${owner.walletAddress.slice(-4)}`
      : 'Unknown creator')
  )
}

export function GroupCard({
  group,
  owner,
  memberCount,
  className
}: GroupCardProps) {
  const router = useRouter()
  const memberLabel = memberCount === 1 ? 'member' : 'members'

  const handleNavigate = () => {
    router.push(`/${group._id}/about`)
  }

  return (
    <button
      type='button'
      onClick={handleNavigate}
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      <div className='relative h-40 w-full overflow-hidden border-b border-border'>
        {group.thumbnailUrl ? (
          <Image
            src={group.thumbnailUrl}
            alt={`${group.name} thumbnail`}
            fill
            className='object-cover'
            sizes='(max-width: 1024px) 100vw, 360px'
          />
        ) : (
          <div className='flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground'>
            Add a thumbnail
          </div>
        )}
      </div>

      <div className='flex flex-1 flex-col gap-3 p-5'>
        <div className='space-y-1.5'>
          <h3 className='text-lg font-semibold text-foreground'>
            {group.name}
          </h3>
          <p className='text-sm text-muted-foreground'>
            {group.shortDescription ??
              group.description?.slice(0, 140) ??
              'No description yet.'}
          </p>
        </div>

        {group.tags && group.tags.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {group.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className='rounded-full bg-muted px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground'
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className='mt-auto space-y-2 text-sm text-muted-foreground'>
          <p>By {formatOwnerLabel(owner)}</p>
          <div className='flex items-center justify-between text-xs uppercase tracking-wide'>
            <span className='inline-flex items-center gap-1 font-semibold text-foreground'>
              <Users className='h-3.5 w-3.5' />
              {memberCount} {memberLabel}
            </span>
            <span className='font-semibold text-primary'>
              {formatGroupPriceLabel(group.price, group.billingCadence, {
                includeCadence: true
              })}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
