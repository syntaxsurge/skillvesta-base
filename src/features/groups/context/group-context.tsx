'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo } from 'react'

import { useQuery } from 'convex/react'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { useCurrentUser } from '@/hooks/use-current-user'

function normalizeEndsOn(value: number | undefined) {
  if (!value || typeof value !== 'number') return undefined
  return value < 1_000_000_000_000 ? value * 1000 : value
}

type GroupContextValue = {
  group: Doc<'groups'>
  isOwner: boolean
  currentUser: Doc<'users'> | null
}

const GroupContext = createContext<GroupContextValue | undefined>(undefined)

export function useGroupContext() {
  const context = useContext(GroupContext)
  if (!context) {
    throw new Error('useGroupContext must be used within a GroupProvider')
  }
  return context
}

type GroupProviderProps = {
  groupId: Id<'groups'>
  children: React.ReactNode
  expiredFallback?: React.ReactNode
}

export function GroupProvider({
  groupId,
  children,
  expiredFallback
}: GroupProviderProps) {
  const router = useRouter()
  const { currentUser } = useCurrentUser()
  const group = useQuery(api.groups.get, { id: groupId })

  useEffect(() => {
    if (group === null) {
      router.replace('/')
    }
  }, [group, router])

  const result = useMemo<
    | { status: 'loading' | 'missing' | 'expired' }
    | { status: 'ready'; value: GroupContextValue }
  >(() => {
    if (group === undefined || currentUser === undefined) {
      return { status: 'loading' as const }
    }

    if (group === null) {
      return { status: 'missing' as const }
    }

    const normalizedEndsOn = normalizeEndsOn(group.endsOn)
    const subscriptionActive =
      typeof normalizedEndsOn === 'number'
        ? normalizedEndsOn >= Date.now()
        : true

    if (!subscriptionActive) {
      return { status: 'expired' as const }
    }

    return {
      status: 'ready' as const,
      value: {
        group,
        currentUser: currentUser ?? null,
        isOwner: currentUser?._id === group.ownerId
      }
    }
  }, [currentUser, group])

  if (result.status !== 'ready') {
    if (result.status === 'expired') {
      return (
        expiredFallback ?? (
          <div className='flex h-full flex-1 items-center justify-center px-8 text-center'>
            <div className='space-y-2'>
              <h2 className='text-xl font-semibold'>
                This group&apos;s subscription has expired.
              </h2>
              <p className='text-sm text-muted-foreground'>
                Contact the group owner to renew access.
              </p>
            </div>
          </div>
        )
      )
    }

    return <LoadingIndicator fullScreen />
  }

  return <GroupContext.Provider value={result.value}>{children}</GroupContext.Provider>
}
