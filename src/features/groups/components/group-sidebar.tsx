'use client'

import { useRouter } from 'next/navigation'

import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'

import { useGroupContext } from '../context/group-context'

type GroupSidebarProps = {
  onEdit?: () => void
}

export function GroupSidebar({ onEdit }: GroupSidebarProps) {
  const router = useRouter()
  const { group, isOwner } = useGroupContext()

  const memberLabel = group.memberNumber === 1 ? 'member' : 'members'

  const handleEditClick = () => {
    if (onEdit) {
      onEdit()
      return
    }

    router.push(`/${group._id}/edit`)
  }

  return (
    <aside className='w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6'>
      <div className='space-y-2'>
        <h2 className='text-2xl font-semibold text-foreground'>{group.name}</h2>
        <p className='flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
          <Lock className='h-3 w-3' />
          Private group
        </p>
      </div>

      <p className='text-sm text-muted-foreground'>{group.shortDescription}</p>

      <p className='text-sm text-muted-foreground'>
        {group.memberNumber} {memberLabel}
      </p>

      {isOwner ? (
        <Button
          className='w-full'
          variant='secondary'
          onClick={handleEditClick}
        >
          Edit group details
        </Button>
      ) : (
        <Button className='w-full'>Join group</Button>
      )}
    </aside>
  )
}
