'use client'

import { useMemo, useState } from 'react'

import { useQuery } from 'convex/react'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import { useAppRouter } from '@/hooks/use-app-router'

import { GroupCard } from './group-card'

type DirectoryEntry = {
  group: Doc<'groups'>
  owner: Doc<'users'> | null
  memberCount: number
}

export function GroupDirectory() {
  const router = useAppRouter()
  const entries = useQuery(api.groups.directory, {}) as
    | DirectoryEntry[]
    | undefined

  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string>('all')

  const allTags = useMemo(() => {
    if (!entries) return []
    const tagSet = new Set<string>()
    for (const entry of entries) {
      for (const tag of entry.group.tags ?? []) {
        tagSet.add(tag)
      }
    }
    return Array.from(tagSet).sort()
  }, [entries])

  const filteredEntries = useMemo(() => {
    if (!entries) return []
    return entries.filter(({ group }) => {
      const matchesTag =
        activeTag === 'all' ||
        (group.tags ?? []).some(tag => tag === activeTag)

      if (!matchesTag) return false

      if (!search.trim()) return true

      const query = search.trim().toLowerCase()
      return (
        group.name.toLowerCase().includes(query) ||
        (group.shortDescription ?? '').toLowerCase().includes(query)
      )
    })
  }, [activeTag, entries, search])

  if (entries === undefined) {
    return <LoadingIndicator fullScreen />
  }

  if (!entries.length) {
    return (
      <div className='flex h-full flex-col items-center justify-center space-y-4 py-16'>
        <p className='text-sm text-muted-foreground'>
          No communities found yet. Create one to get started.
        </p>
        <Button onClick={() => router.push('/create')}>Create a group</Button>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-7xl space-y-8 py-12'>
      <div className='space-y-6 text-center'>
        <h1 className='text-5xl font-bold text-foreground'>
          Discover communities
        </h1>
        <p className='text-base text-muted-foreground'>
          or{' '}
          <button
            onClick={() => router.push('/create')}
            className='font-medium text-accent underline-offset-4 hover:underline'
          >
            create your own
          </button>
        </p>
        <div className='mx-auto max-w-2xl'>
          <Input
            placeholder='Search for anything'
            value={search}
            onChange={event => setSearch(event.target.value)}
            className='h-12 text-base'
          />
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-center gap-2'>
        <button
          type='button'
          onClick={() => setActiveTag('all')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTag === 'all'
              ? 'bg-foreground text-background'
              : 'bg-secondary text-foreground hover:bg-secondary/80'
          }`}
        >
          All
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            type='button'
            onClick={() => setActiveTag(tag)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
              activeTag === tag
                ? 'bg-foreground text-background'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {filteredEntries.length ? (
        <div className='grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
          {filteredEntries.map(entry => (
            <GroupCard
              key={entry.group._id}
              group={entry.group}
              owner={entry.owner}
              memberCount={entry.memberCount}
            />
          ))}
        </div>
      ) : (
        <div className='rounded-xl border border-border bg-card py-16 text-center text-sm text-muted-foreground'>
          No communities match your filters. Try another tag or clear your search.
        </div>
      )}
    </div>
  )
}
