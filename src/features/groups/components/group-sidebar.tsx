'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

import { useMutation } from 'convex/react'
import { Check, Copy, Globe, Lock } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { api } from '@/convex/_generated/api'
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
  const { group, isOwner, memberCount, currentUser } = useGroupContext()
  const removeGroup = useMutation(api.groups.remove)
  const totalMembers =
    typeof memberCount === 'number'
      ? memberCount
      : group.memberNumber ?? 0
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }

    return () => {
      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current)
      }
    }
  }, [])

  const groupUrl = origin ? `${origin}/${group._id}` : `/${group._id}`

  const handleCopyUrl = async () => {
    if (!groupUrl || typeof navigator === 'undefined' || !navigator.clipboard) {
      return
    }

    try {
      await navigator.clipboard.writeText(groupUrl)
      setCopied(true)

      if (copyResetTimeout.current) {
        clearTimeout(copyResetTimeout.current)
      }

      copyResetTimeout.current = setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      // noop on clipboard failure; leaving silent to avoid UI jitter
    }
  }

  const handleEditClick = () => {
    if (onEdit) {
      onEdit()
      return
    }

    router.push(`/${group._id}/edit`)
  }

  const handleDeleteGroup = async () => {
    if (!isOwner) {
      toast.error('Only the owner can delete this group.')
      return
    }

    if (!currentUser?.walletAddress) {
      toast.error('Connect your wallet to delete this group.')
      return
    }

    setIsDeleting(true)

    try {
      await removeGroup({
        groupId: group._id,
        ownerAddress: currentUser.walletAddress
      })
      toast.success('Group deleted.')
      setIsDeleteOpen(false)
      router.replace('/groups')
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to delete group. Try again later.'
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
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
        <div className='flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2 shadow-inner'>
          <div className='min-w-0 flex-1'>
            <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
              Group URL
            </p>
            <p className='truncate text-sm font-medium text-foreground/90'>
              {groupUrl}
            </p>
          </div>
          <Button
            type='button'
            size='sm'
            variant='secondary'
            onClick={handleCopyUrl}
            disabled={!groupUrl}
            className='shrink-0 gap-2'
            aria-label={copied ? 'Group URL copied' : 'Copy group URL to clipboard'}
          >
            {copied ? <Check className='h-4 w-4' /> : <Copy className='h-4 w-4' />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
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
        <div className='space-y-3'>
          <Button
            className='w-full uppercase'
            variant='secondary'
            onClick={handleEditClick}
          >
            Edit group details
          </Button>

          <Dialog
            open={isDeleteOpen}
            onOpenChange={open => {
              if (isDeleting) return
              setIsDeleteOpen(open)
            }}
          >
            <DialogTrigger asChild>
              <Button
                type='button'
                variant='destructive'
                className='w-full uppercase'
                disabled={isDeleting}
              >
                Delete group
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this group?</DialogTitle>
                <DialogDescription>
                  This action permanently removes the group, its members,
                  classroom courses, posts, and associated media references.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    variant='ghost'
                    type='button'
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type='button'
                  variant='destructive'
                  onClick={handleDeleteGroup}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete group'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <JoinGroupButton />
      )}

      <div className='pt-2 text-center text-xs text-muted-foreground'>
        Powered by <span className='font-semibold'>skillvesta</span>
      </div>
    </aside>
  )
}
