'use client'

import { useMemo } from 'react'

import { Calendar, CreditCard, Globe, Lock, Users } from 'lucide-react'

import { GroupDescriptionEditor } from './group-description-editor'
import { GroupMediaCarousel } from './group-media-carousel'
import { GroupSidebar } from './group-sidebar'
import { useGroupContext } from '../context/group-context'
import { formatGroupPriceLabel } from '../utils/price'
import { formatTimestampRelative } from '@/lib/time'

export function GroupAboutSection() {
  const { group, owner, isOwner, memberCount, membership } = useGroupContext()

  const mediaSources = useMemo(() => {
    const sources: string[] = []
    if (group.aboutUrl) sources.push(group.aboutUrl)
    if (Array.isArray(group.galleryUrls)) {
      sources.push(...group.galleryUrls)
    }
    return sources
  }, [group.aboutUrl, group.galleryUrls])

  const privacy =
    group.visibility === 'public'
      ? { icon: Globe, label: 'Public community' }
      : { icon: Lock, label: 'Private community' }

  const totalMembers =
    typeof memberCount === 'number'
      ? memberCount
      : group.memberNumber ?? 0

  const priceLabel = formatGroupPriceLabel(
    group.price,
    group.billingCadence,
    { includeCadence: true }
  )

  const creatorName =
    owner?.displayName ??
    owner?.basename ??
    (owner?.walletAddress
      ? `${owner.walletAddress.slice(0, 6)}...${owner.walletAddress.slice(-4)}`
      : 'Unknown creator')

  const membershipExpiryLabel = useMemo(() => {
    if (membership.status !== 'active') return null
    const rawExpiry = membership.passExpiresAt
    if (!rawExpiry || !Number.isFinite(rawExpiry) || rawExpiry <= 0) {
      return 'No expiry scheduled'
    }

    const expiryMs = rawExpiry < 1_000_000_000_000 ? rawExpiry * 1000 : rawExpiry
    const expirySeconds = Math.floor(expiryMs / 1000)
    const relative = formatTimestampRelative(expirySeconds)
    const absolute = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(expiryMs))

    return `${absolute} (${relative})`
  }, [membership.passExpiresAt, membership.status])

  return (
    <div className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]'>
      <div className='space-y-6 rounded-2xl border border-border bg-card p-6'>
        <div className='space-y-6'>
          <div className='space-y-2'>
            <h1 className='text-3xl font-semibold text-foreground'>
              {group.name}
            </h1>
            <p className='text-base text-muted-foreground'>
              {group.shortDescription ?? 'Tell your members what to expect from this community.'}
            </p>
          </div>

          <GroupMediaCarousel
            sources={mediaSources}
            fallbackImage={group.thumbnailUrl}
          />

          <div className='flex flex-wrap gap-4 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground'>
            <span className='inline-flex items-center gap-2'>
              <privacy.icon className='h-4 w-4' />
              {privacy.label}
            </span>
            <span className='inline-flex items-center gap-2'>
              <Users className='h-4 w-4' />
              {totalMembers} {totalMembers === 1 ? 'member' : 'members'}
            </span>
            <span className='inline-flex items-center gap-2'>
              <CreditCard className='h-4 w-4' />
              {priceLabel}
            </span>
            <span className='inline-flex items-center gap-2'>
              <span className='flex h-6 w-6 items-center justify-center rounded-full bg-background font-semibold'>
                {creatorName.slice(0, 1).toUpperCase()}
              </span>
              By {creatorName}
            </span>
            {membershipExpiryLabel && (
              <span className='inline-flex items-center gap-2'>
                <Calendar className='h-4 w-4' />
                Pass expires {membershipExpiryLabel}
              </span>
            )}
          </div>

          {group.tags && group.tags.length > 0 && (
            <div className='flex flex-wrap gap-2'>
              {group.tags.map(tag => (
                <span
                  key={tag}
                  className='rounded-full border border-border px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground'
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <GroupDescriptionEditor
          editable={isOwner}
          groupId={group._id}
          initialContent={group.description}
        />
      </div>

      <GroupSidebar />
    </div>
  )
}
