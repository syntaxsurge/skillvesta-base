'use client'

import { useEffect, useMemo, useState } from 'react'

import { Calendar, CreditCard, Globe, Lock, Users } from 'lucide-react'
import { Address } from 'viem'
import { useAccount, usePublicClient } from 'wagmi'

import { GroupDescriptionEditor } from './group-description-editor'
import { GroupMediaCarousel } from './group-media-carousel'
import { GroupSidebar } from './group-sidebar'
import { useGroupContext } from '../context/group-context'
import { normalizePassExpiry, resolveMembershipCourseId } from '../utils/membership'
import { formatGroupPriceLabel } from '../utils/price'
import { formatTimestampRelative } from '@/lib/time'
import { MEMBERSHIP_CONTRACT_ADDRESS } from '@/lib/config'
import { MembershipPassService } from '@/lib/onchain/services/membershipPassService'
import { ACTIVE_CHAIN } from '@/lib/wagmi'

export function GroupAboutSection() {
  const { group, owner, isOwner, memberCount, membership, currentUser } = useGroupContext()
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const membershipAddress = MEMBERSHIP_CONTRACT_ADDRESS as `0x${string}` | null
  const membershipService = useMemo(() => {
    if (!publicClient || !membershipAddress) return null
    return new MembershipPassService({
      publicClient: publicClient as any,
      address: membershipAddress
    })
  }, [publicClient, membershipAddress])
  const membershipCourseId = useMemo(() => resolveMembershipCourseId(group), [group])
  const [passExpiryMs, setPassExpiryMs] = useState<number | null>(() => {
    const normalized = normalizePassExpiry(membership.passExpiresAt)
    return normalized ?? null
  })

  useEffect(() => {
    const normalized = normalizePassExpiry(membership.passExpiresAt)
    setPassExpiryMs(normalized ?? null)
  }, [membership.passExpiresAt])

  useEffect(() => {
    if (
      membership.status !== 'active' ||
      !membershipService ||
      !membershipCourseId
    ) {
      return
    }

    const walletAddress = (address ?? currentUser?.walletAddress) as Address | undefined
    if (!walletAddress) return

    let cancelled = false
    membershipService
      .getPassState(membershipCourseId, walletAddress)
      .then(state => normalizePassExpiry(state.expiresAt))
      .then(expiry => {
        if (!cancelled) {
          setPassExpiryMs(expiry ?? null)
        }
      })
      .catch(error => {
        console.error('Failed to resolve membership expiry for about page', error)
      })

    return () => {
      cancelled = true
    }
  }, [
    address,
    currentUser?.walletAddress,
    membership.status,
    membershipService,
    membershipCourseId
  ])

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
    if (!passExpiryMs) {
      return 'No expiry scheduled'
    }

    const expirySeconds = Math.floor(passExpiryMs / 1000)
    const relative = formatTimestampRelative(expirySeconds)
    const absolute = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(passExpiryMs))

    return `${absolute} (${relative})`
  }, [membership.status, passExpiryMs])

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
