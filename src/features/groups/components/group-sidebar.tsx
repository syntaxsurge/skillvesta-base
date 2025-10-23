'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import { CreditCard, Globe, Lock, Tag, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useGroupContext } from '../context/group-context'
import { JoinGroupButton } from './join-group-button'
import { formatGroupPriceLabel } from '../utils/price'

type GroupSidebarProps = {
  onEdit?: () => void
}

function formatMemberLabel(count: number) {
  return count === 1 ? 'member' : 'members'
}

function formatCreatorName({
  displayName,
  basename,
  walletAddress
}: {
  displayName?: string | null
  basename?: string | null
  walletAddress?: string | null
}) {
  if (displayName) return displayName
  if (basename) return basename
  if (!walletAddress) return 'Unknown creator'
  return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
}

export function GroupSidebar({ onEdit }: GroupSidebarProps) {
  const router = useRouter()
  const { group, owner, isOwner, memberCount } = useGroupContext()
  const totalMembers =
    typeof memberCount === 'number'
      ? memberCount
      : group.memberNumber ?? 0

  const handleEditClick = () => {
    if (onEdit) {
      onEdit()
      return
    }

    router.push(`/${group._id}/edit`)
  }

  const privacy =
    group.visibility === 'public'
      ? { icon: Globe, label: 'Public group' }
      : { icon: Lock, label: 'Private group' }

  const priceLabel = formatGroupPriceLabel(
    group.price,
    group.billingCadence,
    { includeCadence: true }
  )

  return (
    <aside className='w-full max-w-sm space-y-5 rounded-2xl border border-border bg-card p-6'>
      <div className='space-y-4'>
        {group.thumbnailUrl ? (
          <div className='relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border'>
            <Image
              src={group.thumbnailUrl}
              alt={`${group.name} thumbnail`}
              fill
              sizes='(max-width: 768px) 100vw, 320px'
              className='object-cover'
            />
          </div>
        ) : (
          <div className='flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted text-muted-foreground'>
            <span className='text-xs uppercase tracking-wide'>
              No thumbnail
            </span>
          </div>
        )}

        <div>
          <h2 className='text-2xl font-semibold text-foreground'>
            {group.name}
          </h2>
          <p className='text-sm text-muted-foreground'>
            By{' '}
            {formatCreatorName({
              displayName: owner?.displayName ?? null,
              basename: owner?.basename ?? null,
              walletAddress: owner?.walletAddress ?? null
            })}
          </p>
        </div>
      </div>

      <p className='text-sm text-muted-foreground'>
        {group.shortDescription ?? 'No summary provided yet.'}
      </p>

      <div className='grid gap-3 rounded-xl bg-muted/60 p-4 text-sm'>
        <div className='flex items-center gap-3'>
          <privacy.icon className='h-4 w-4 text-muted-foreground' />
          <span>{privacy.label}</span>
        </div>
        <div className='flex items-center gap-3'>
          <Users className='h-4 w-4 text-muted-foreground' />
          <span>
            {totalMembers} {formatMemberLabel(totalMembers)}
          </span>
        </div>
        <div className='flex items-center gap-3'>
          <CreditCard className='h-4 w-4 text-muted-foreground' />
          <span>{priceLabel}</span>
        </div>
        {group.tags && group.tags.length > 0 && (
          <div className='flex items-start gap-3'>
            <Tag className='mt-0.5 h-4 w-4 text-muted-foreground' />
            <div className='flex flex-wrap gap-2'>
              {group.tags.map(tag => (
                <span
                  key={tag}
                  className='rounded-full bg-background px-2 py-1 text-xs font-medium text-muted-foreground'
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {isOwner ? (
        <Button
          className='w-full'
          variant='secondary'
          onClick={handleEditClick}
        >
          Edit group details
        </Button>
      ) : (
        <JoinGroupButton />
      )}
    </aside>
  )
}
