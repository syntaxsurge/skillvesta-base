'use client'

import Image from 'next/image'

import { CreditCard, Globe, Lock, Tag, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAppRouter } from '@/hooks/use-app-router'

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
  const router = useAppRouter()
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
    <aside className='w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm'>
      {group.thumbnailUrl ? (
        <div className='relative aspect-video w-full overflow-hidden rounded-lg'>
          <Image
            src={group.thumbnailUrl}
            alt={`${group.name} thumbnail`}
            fill
            sizes='(max-width: 768px) 100vw, 320px'
            className='object-cover'
          />
        </div>
      ) : (
        <div className='flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-muted-foreground'>
          <span className='text-xs font-medium uppercase tracking-wide'>
            No thumbnail
          </span>
        </div>
      )}

      <div className='space-y-2'>
        <h2 className='text-2xl font-bold text-foreground'>{group.name}</h2>
        <p className='text-sm text-muted-foreground'>
          skool.com/{group._id}
        </p>
      </div>

      <p className='text-sm leading-relaxed text-foreground'>
        {group.shortDescription ?? 'No summary provided yet.'}
      </p>

      <div className='grid grid-cols-3 gap-4 border-t border-border pt-4 text-center'>
        <div>
          <div className='text-xl font-bold text-foreground'>{totalMembers}</div>
          <div className='text-xs text-muted-foreground'>Members</div>
        </div>
        <div>
          <div className='text-xl font-bold text-foreground'>0</div>
          <div className='text-xs text-muted-foreground'>Online</div>
        </div>
        <div>
          <div className='text-xl font-bold text-foreground'>1</div>
          <div className='text-xs text-muted-foreground'>Admins</div>
        </div>
      </div>

      {isOwner ? (
        <Button
          className='w-full uppercase'
          variant='secondary'
          onClick={handleEditClick}
        >
          Edit group details
        </Button>
      ) : (
        <JoinGroupButton />
      )}

      <div className='pt-2 text-center text-xs text-muted-foreground'>
        Powered by <span className='font-semibold'>skillvesta</span>
      </div>
    </aside>
  )
}
