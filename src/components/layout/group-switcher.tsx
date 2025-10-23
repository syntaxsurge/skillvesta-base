'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { useQuery } from 'convex/react'
import { ChevronDown, Compass, Plus } from 'lucide-react'
import { useAccount } from 'wagmi'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'

export function GroupSwitcher() {
  const router = useRouter()
  const params = useParams()
  const { address } = useAccount()

  const [open, setOpen] = useState(false)

  const activeGroupId = useMemo(() => {
    if (!params?.groupId) return undefined
    return params.groupId as Id<'groups'>
  }, [params])

  const activeGroup = useQuery(
    api.groups.get,
    activeGroupId ? { id: activeGroupId } : { id: undefined }
  ) as Doc<'groups'> | null | undefined
  const ownedGroups = useQuery(
    api.groups.list,
    address ? { address } : { address: undefined }
  ) as Array<Doc<'groups'>> | undefined

  const handleSelect = (groupId: Id<'groups'>) => {
    router.push(`/${groupId}/about`)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type='button'
          className='inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium transition hover:border-border'
        >
          {activeGroup ? (
            <>
              <Avatar className='h-8 w-8'>
                {activeGroup.thumbnailUrl && (
                  <AvatarImage
                    src={activeGroup.thumbnailUrl}
                    alt={`${activeGroup.name} thumbnail`}
                  />
                )}
                <AvatarFallback>
                  {activeGroup.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{activeGroup.name}</span>
            </>
          ) : (
            <>
              <Compass className='h-4 w-4 text-muted-foreground' />
              <span className='text-sm text-muted-foreground'>Select a group</span>
            </>
          )}
          <ChevronDown className='h-4 w-4' />
        </button>
      </PopoverTrigger>

      <PopoverContent className='w-64 space-y-3 p-3' align='start'>
        <button
          type='button'
          onClick={() => {
            router.push('/create')
            setOpen(false)
          }}
          className='flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted'
        >
          <Plus className='h-4 w-4' /> Create a group
        </button>

        <Link
          href='/groups'
          onClick={() => setOpen(false)}
          className='flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted'
        >
          <Compass className='h-4 w-4' /> Discover groups
        </Link>

        <div className='space-y-1'>
          <p className='px-2 text-xs font-semibold uppercase text-muted-foreground'>
            My groups
          </p>
          {(!ownedGroups || ownedGroups.length === 0) && (
            <p className='px-2 text-xs text-muted-foreground'>
              You have no groups yet.
            </p>
          )}
          {(ownedGroups ?? []).map(group => (
            <button
              type='button'
              key={group._id}
              onClick={() => handleSelect(group._id)}
              className='flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted'
            >
              <Avatar className='h-7 w-7'>
                {group.thumbnailUrl && (
                  <AvatarImage
                    src={group.thumbnailUrl}
                    alt={`${group.name} thumbnail`}
                  />
                )}
                <AvatarFallback>
                  {group.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className='truncate'>{group.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
