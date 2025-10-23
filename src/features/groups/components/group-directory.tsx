'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useQuery } from 'convex/react'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'

import { GroupCard } from './group-card'

type DirectoryEntry = {
  group: Doc<'groups'>
  owner: Doc<'users'> | null
  memberCount: number
}

export function GroupDirectory() {
  const router = useRouter()
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
    <div className='space-y-8'>
      <div className='space-y-4 text-center'>
        <h1 className='text-3xl font-semibold text-foreground'>
          Discover communities
        </h1>
        <p className='text-sm text-muted-foreground'>
          Browse active groups, compare member benefits, and join the ones that resonate with you.
        </p>
        <div className='mx-auto max-w-xl'>
          <Input
            placeholder='Search for anything'
            value={search}
            onChange={event => setSearch(event.target.value)}
            className='h-11'
          />
        </div>
      </div>

      <div className='flex flex-wrap items-center justify-center gap-2'>
        <Button
          type='button'
          variant={activeTag === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveTag('all')}
          className='rounded-full px-4 py-1 text-sm'
        >
          All
        </Button>
        {allTags.map(tag => (
          <Button
            key={tag}
            type='button'
            variant={activeTag === tag ? 'default' : 'outline'}
            onClick={() => setActiveTag(tag)}
            className='rounded-full px-4 py-1 text-sm capitalize'
          >
            {tag}
          </Button>
        ))}
      </div>

      {filteredEntries.length ? (
        <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
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
        <div className='rounded-2xl border border-dashed border-border bg-card/60 py-16 text-center text-sm text-muted-foreground'>
          No groups match your filters yet. Try another tag or clear your search.
        </div>
      )}
    </div>
  )
}
