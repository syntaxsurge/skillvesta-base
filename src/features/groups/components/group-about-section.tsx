'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
  Users
} from 'lucide-react'
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

type CourseVerificationState =
  | { status: 'checking' }
  | { status: 'verified' }
  | { status: 'missing'; message: string }
  | { status: 'error'; message: string }

export function GroupAboutSection() {
  const { group, owner, isOwner, memberCount, membership, currentUser } = useGroupContext()
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const membershipAddress = useMemo(() => {
    const value = MEMBERSHIP_CONTRACT_ADDRESS?.trim()
    return value ? (value as `0x${string}`) : null
  }, [])
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
  const [courseVerification, setCourseVerification] = useState<CourseVerificationState>(() =>
    membershipCourseId
      ? { status: 'checking' }
      : { status: 'missing', message: 'Membership course ID not assigned.' }
  )

  useEffect(() => {
    const normalized = normalizePassExpiry(membership.passExpiresAt)
    setPassExpiryMs(normalized ?? null)
  }, [membership.passExpiresAt])

  useEffect(() => {
    if (!membershipCourseId) {
      setCourseVerification({
        status: 'missing',
        message: 'Membership course ID not assigned.'
      })
      return
    }

    if (!membershipAddress) {
      setCourseVerification({
        status: 'error',
        message: 'Membership contract address is not configured.'
      })
      return
    }

    if (!membershipService) {
      setCourseVerification({ status: 'checking' })
      return
    }

    let cancelled = false
    setCourseVerification({ status: 'checking' })

    membershipService
      .getCourse(membershipCourseId)
      .then(() => {
        if (!cancelled) {
          setCourseVerification({ status: 'verified' })
        }
      })
      .catch(error => {
        if (cancelled) return
        const errorMessage = error instanceof Error ? error.message : ''
        const notFound = /CourseNotFound/i.test(errorMessage)
        if (!notFound) {
          console.error('Failed to verify membership course for about page', error)
        }
        setCourseVerification(
          notFound
            ? {
                status: 'missing',
                message:
                  'No on-chain course found for this ID. Contact the creator to refresh registration.'
              }
            : {
                status: 'error',
                message: 'Unable to confirm on-chain course. Try again later.'
              }
        )
      })

    return () => {
      cancelled = true
    }
  }, [membershipAddress, membershipCourseId, membershipService])

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
  const membershipCourseIdLabel = membershipCourseId ? membershipCourseId.toString() : 'Not assigned'
  const explorerName = ACTIVE_CHAIN.blockExplorers?.default.name ?? 'block explorer'
  const explorerUrl = useMemo(() => {
    if (!membershipCourseId || !membershipAddress) return null
    const baseUrl = ACTIVE_CHAIN.blockExplorers?.default.url
    if (!baseUrl) return null
    return `${baseUrl}/token/${membershipAddress}?a=${membershipCourseId.toString()}`
  }, [membershipAddress, membershipCourseId])
  const verificationNode = useMemo(() => {
    switch (courseVerification.status) {
      case 'checking':
        return (
          <div className='inline-flex items-center gap-2 text-muted-foreground'>
            <Loader2 className='h-3 w-3 animate-spin' />
            <span>Checking on-chain deployment...</span>
          </div>
        )
      case 'verified':
        return (
          <div className='inline-flex flex-wrap items-center gap-2 text-emerald-600 dark:text-emerald-400'>
            <CheckCircle2 className='h-4 w-4' />
            <span>Course verified on chain.</span>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 font-medium underline decoration-dotted underline-offset-4'
              >
                View on {explorerName}
                <ExternalLink className='h-3 w-3' />
              </a>
            ) : null}
          </div>
        )
      case 'missing':
        return (
          <div className='inline-flex items-start gap-2 text-amber-600 dark:text-amber-400'>
            <AlertCircle className='mt-0.5 h-4 w-4 flex-shrink-0' />
            <span>{courseVerification.message}</span>
          </div>
        )
      case 'error':
        return (
          <div className='inline-flex items-start gap-2 text-destructive'>
            <AlertCircle className='mt-0.5 h-4 w-4 flex-shrink-0' />
            <span>{courseVerification.message}</span>
          </div>
        )
      default:
        return null
    }
  }, [courseVerification, explorerName, explorerUrl])

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

          <div className='space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <p className='text-xs font-medium uppercase text-muted-foreground'>
                  Membership course ID
                </p>
                <p className='mt-1 font-mono text-base text-foreground'>
                  {membershipCourseIdLabel}
                </p>
              </div>
            </div>
            <div className='pt-1 text-xs text-muted-foreground'>{verificationNode}</div>
          </div>
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
