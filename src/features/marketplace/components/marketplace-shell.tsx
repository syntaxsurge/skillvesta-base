'use client'

import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { useQuery as useConvexQuery } from 'convex/react'
import { toast } from 'sonner'
import { parseUnits, type Address } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { getCourseCatalog, type CourseCatalogItem } from '@/lib/catalog/courses'
import { api } from '@/convex/_generated/api'
import {
  MARKETPLACE_CONTRACT_ADDRESS,
  MEMBERSHIP_CONTRACT_ADDRESS,
  PLATFORM_TREASURY_ADDRESS
} from '@/lib/config'
import { ACTIVE_CHAIN } from '@/lib/wagmi'
import {
  MarketplaceService,
  MembershipPassService,
  type MarketplaceListing
} from '@/lib/onchain/services'
import { SUBSCRIPTION_PRICE_LABEL, SUBSCRIPTION_PRICE_USDC } from '@/lib/pricing'
import { formatDurationShort, formatTimestampRelative } from '@/lib/time'
import { formatUSDC } from '@/lib/usdc'

const DEFAULT_LISTING_DURATION = 60n * 60n * 24n * 3n // 3 days
const LISTING_DURATION_CHOICES: { label: string; value: bigint }[] = [
  { label: '24 hours', value: 60n * 60n * 24n },
  { label: '3 days', value: 60n * 60n * 24n * 3n },
  { label: '7 days', value: 60n * 60n * 24n * 7n }
]

type MarketplaceCourse = {
  catalog: CourseCatalogItem
  floorPrice: bigint | null
  listings: MarketplaceListing[]
  stats: {
    listingCount: number
    primaryPrice: bigint
    duration: bigint
    cooldown: bigint
  }
  user?: {
    hasPass: boolean
    canTransfer: boolean
    transferAvailableAt: bigint
    expiresAt: bigint
  }
}

type ExpiryFilter = 'any' | '7d' | '30d' | 'no-expiry'

type Filters = {
  search: string
  expiry: ExpiryFilter
  onlyListings: boolean
}

const defaultFilters: Filters = {
  search: '',
  expiry: 'any',
  onlyListings: false
}

function toListingExpirySeconds(listing: MarketplaceListing): number | null {
  if (listing.expiresAt === 0n) return null
  const value = Number(listing.expiresAt)
  if (!Number.isFinite(value)) return null
  return value
}

function getNextListingExpiry(listings: MarketplaceListing[]): number | null {
  const now = Math.floor(Date.now() / 1000)
  const futureExpiries = listings
    .map(toListingExpirySeconds)
    .filter((value): value is number => value !== null && value > now)
  if (futureExpiries.length === 0) return null
  return futureExpiries.reduce((min, value) => (value < min ? value : min), futureExpiries[0])
}

function shortenAddress(address: string) {
  if (address.length <= 10) return address
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function MarketplaceShell() {
  const catalog = useMemo(() => getCourseCatalog(), [])
  const { address } = useAccount()
  // Fetch groups owned by or associated with the current wallet to discover dynamic courseIds
  const myGroups = useConvexQuery(
    api.groups.list,
    address ? { address } : { address: undefined }
  ) as any[] | undefined

  // Extend catalog with dynamic entries sourced from groups (subscriptionId)
  const dynamicCatalog = useMemo<CourseCatalogItem[]>(() => {
    const extras: CourseCatalogItem[] = []
    const seen = new Set<string>(catalog.map(c => c.courseId.toString()))
    ;(myGroups ?? []).forEach(group => {
      const subId = group?.subscriptionId
      if (!subId) return
      try {
        const courseId = BigInt(String(subId))
        const key = courseId.toString()
        if (seen.has(key)) return
        seen.add(key)
        extras.push({
          courseId,
          title: group.name ?? `Membership #${key}`,
          subtitle: group.shortDescription ?? 'Community membership',
          category: 'Community',
          difficulty: 'Beginner',
          coverGradient: 'from-slate-500 via-slate-600 to-slate-700',
          tags: Array.isArray(group.tags) ? group.tags : [],
          summary:
            group.shortDescription ??
            'Membership minted via Registrar; duration & cooldown pulled from chain.'
        })
      } catch {}
    })
    return [...catalog, ...extras]
  }, [catalog, myGroups])

  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [listDialog, setListDialog] = useState<{ open: boolean; course?: MarketplaceCourse }>(
    { open: false }
  )

  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const { data: walletClient } = useWalletClient()

  const marketplaceAddress = MARKETPLACE_CONTRACT_ADDRESS as Address | undefined
  const membershipAddress = MEMBERSHIP_CONTRACT_ADDRESS as Address | undefined

  const readOnlyMarketplace = useMemo(() => {
    if (!publicClient || !marketplaceAddress) return null
    return new MarketplaceService({
      publicClient: publicClient as any,
      address: marketplaceAddress
    })
  }, [publicClient, marketplaceAddress])

  const readOnlyMembership = useMemo(() => {
    if (!publicClient || !membershipAddress) return null
    return new MembershipPassService({
      publicClient: publicClient as any,
      address: membershipAddress
    })
  }, [publicClient, membershipAddress])

  const writableMarketplace = useMemo(() => {
    if (!publicClient || !walletClient || !marketplaceAddress || !address) return null
    return new MarketplaceService({
      publicClient: publicClient as any,
      walletClient,
      account: address,
      address: marketplaceAddress
    })
  }, [publicClient, walletClient, marketplaceAddress, address])

  const writableMembership = useMemo(() => {
    if (!publicClient || !walletClient || !membershipAddress || !address) return null
    return new MembershipPassService({
      publicClient: publicClient as any,
      walletClient,
      account: address,
      address: membershipAddress
    })
  }, [publicClient, walletClient, membershipAddress, address])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['marketplace-feed', marketplaceAddress, membershipAddress, address, dynamicCatalog.map(c=>c.courseId.toString()).join(',')],
    enabled: Boolean(readOnlyMarketplace && readOnlyMembership),
    queryFn: async (): Promise<MarketplaceCourse[]> => {
      if (!readOnlyMarketplace || !readOnlyMembership) return []

      const results: Array<MarketplaceCourse | null> = await Promise.all(
        dynamicCatalog.map(async catalogItem => {
          const courseId = catalogItem.courseId
          try {
            const [courseConfig, listings] = await Promise.all([
              readOnlyMembership.getCourse(courseId),
              readOnlyMarketplace.getActiveListings(courseId)
            ])

            let userState: MarketplaceCourse['user']
            if (address) {
              const [balance, transferInfo, passState] = await Promise.all([
                readOnlyMembership.balanceOf(address as Address, courseId),
                readOnlyMembership.canTransfer(courseId, address as Address),
                readOnlyMembership.getPassState(courseId, address as Address)
              ])

              userState = {
                hasPass: balance > 0n,
                canTransfer: transferInfo.eligible,
                transferAvailableAt: transferInfo.availableAt,
                expiresAt: passState.expiresAt
              }
            }

            const floor = listings.reduce<bigint | null>((lowest, listing) => {
              if (!lowest || listing.priceUSDC < lowest) return listing.priceUSDC
              return lowest
            }, null)

            return {
              catalog: catalogItem,
              floorPrice: floor,
              listings,
              stats: {
                listingCount: listings.length,
                primaryPrice: courseConfig.priceUSDC,
                duration: courseConfig.duration,
                cooldown: courseConfig.transferCooldown
              },
              user: userState
            } as MarketplaceCourse
          } catch (error) {
            console.error('[Marketplace] Failed to hydrate course state', {
              courseId: courseId.toString(),
              error
            })
            return null
          }
        })
      )

      return results.filter((entry): entry is MarketplaceCourse => entry !== null)
    }
  })

  const filteredCourses = useMemo(() => {
    if (!data) return []
    const term = filters.search.trim().toLowerCase()
    const nowSeconds = Math.floor(Date.now() / 1000)
    const windowSeconds =
      filters.expiry === '7d' ? 7 * 86_400 : filters.expiry === '30d' ? 30 * 86_400 : null

    const matchesSearch = (entry: MarketplaceCourse) => {
      if (!term) return true
      return (
        entry.catalog.title.toLowerCase().includes(term) ||
        entry.catalog.summary.toLowerCase().includes(term) ||
        entry.catalog.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    const matchesExpiry = (entry: MarketplaceCourse) => {
      if (filters.expiry === 'any') return true
      if (entry.listings.length === 0) return false

      if (filters.expiry === 'no-expiry') {
        return entry.listings.some(listing => listing.expiresAt === 0n)
      }

      if (!windowSeconds) return true

      return entry.listings.some(listing => {
        if (listing.expiresAt === 0n) return false
        const expirySeconds = Number(listing.expiresAt)
        if (!Number.isFinite(expirySeconds)) return false
        if (expirySeconds <= nowSeconds) return false
        return expirySeconds - nowSeconds <= windowSeconds
      })
    }

    return data.filter(entry => {
      if (filters.onlyListings && entry.stats.listingCount === 0) return false
      if (!matchesExpiry(entry)) return false
      return matchesSearch(entry)
    })
  }, [data, filters])

  const ownedCourses = useMemo(() => {
    const entries = (data ?? []).filter(course => course.user?.hasPass)
    return entries.sort((a, b) =>
      a.catalog.title.localeCompare(b.catalog.title)
    )
  }, [data])

  useEffect(() => {
    const ownedIds = ownedCourses.map(course => course.catalog.courseId.toString())
    const groups = (myGroups ?? []).map(group => ({
      id: group?._id,
      subscriptionId: group?.subscriptionId
    }))
    console.log('[Marketplace] Snapshot', {
      wallet: address ?? 'disconnected',
      hydratedCourses: data?.length ?? 0,
      ownedCourseIds: ownedIds,
      myGroupSubscriptions: groups
    })
  }, [address, data, myGroups, ownedCourses])
  const preferredCourse = useMemo(
    () =>
      ownedCourses.find(course => course.user?.canTransfer) ?? ownedCourses[0],
    [ownedCourses]
  )

  const contractsConfigured = Boolean(marketplaceAddress && membershipAddress)

  const openListDialog = (course: MarketplaceCourse) => {
    if (course.user?.hasPass && course.user.canTransfer === false) {
      const availableAt = course.user.transferAvailableAt
      const availabilityLabel =
        availableAt === 0n
          ? 'soon'
          : formatTimestampRelative(availableAt)
      toast.info(
        availableAt === 0n
          ? 'Transfer cooldown is still settling. Try again shortly.'
          : `Transfer cooldown ends ${availabilityLabel}. You can prepare your listing details now.`
      )
    }
    setListDialog({ open: true, course })
  }

  const closeListDialog = () => setListDialog({ open: false })

  const handleListFromHero = () => {
    if (!preferredCourse) {
      toast.info('Mint a membership pass before listing.')
      return
    }
    openListDialog(preferredCourse)
  }

  const handlePrimaryPurchase = async (course: MarketplaceCourse) => {
    if (!writableMarketplace) {
      toast.error('Connect your wallet to purchase memberships')
      return
    }
    try {
      const hash = await writableMarketplace.purchasePrimary(
        course.catalog.courseId,
        course.stats.primaryPrice
      )
      await publicClient?.waitForTransactionReceipt({ hash })
      toast.success('Membership minted successfully')
      refetch()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.shortMessage ?? 'Purchase failed')
    }
  }

  const handleBuyFloor = async (course: MarketplaceCourse) => {
    if (!writableMarketplace) {
      toast.error('Connect your wallet to purchase listings')
      return
    }
    if (!course.floorPrice || course.listings.length === 0) {
      toast.error('No listings available right now')
      return
    }

    const floorListing = course.listings.reduce((best, listing) =>
      listing.priceUSDC < best.priceUSDC ? listing : best
    )

    try {
      const hash = await writableMarketplace.buyListing(
        course.catalog.courseId,
        floorListing.seller,
        floorListing.priceUSDC
      )
      await publicClient?.waitForTransactionReceipt({ hash })
      toast.success('Listing purchased successfully')
      refetch()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.shortMessage ?? 'Unable to buy listing')
    }
  }

  const handleRenew = async (course: MarketplaceCourse) => {
    if (!writableMarketplace) {
      toast.error('Connect your wallet to renew memberships')
      return
    }
    try {
      const hash = await writableMarketplace.renew(
        course.catalog.courseId,
        course.stats.primaryPrice
      )
      await publicClient?.waitForTransactionReceipt({ hash })
      toast.success('Membership renewed')
      refetch()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.shortMessage ?? 'Unable to renew membership')
    }
  }

  const handleCreateListing = async (payload: {
    price: string
    duration: bigint
    course: MarketplaceCourse
  }) => {
    if (!writableMarketplace || !writableMembership || !address) {
      toast.error('Connect your wallet to list memberships')
      return
    }

    if (payload.course.user && !payload.course.user.canTransfer) {
      const availableAt = payload.course.user.transferAvailableAt
      const availabilityLabel =
        availableAt === 0n
          ? 'soon'
          : formatTimestampRelative(availableAt)
      toast.info(
        availableAt === 0n
          ? 'Transfer cooldown is still settling. Try again shortly.'
          : `Transfer cooldown ends ${availabilityLabel}.`
      )
      return
    }

    try {
      const priceAmount = parseUnits(payload.price, 6)
      const approvalGranted = await writableMembership.isApprovedForAll(
        address as Address,
        marketplaceAddress as Address
      )

      if (!approvalGranted) {
        const approvalHash = await writableMembership.setApprovalForAll(
          marketplaceAddress as Address,
          true
        )
        await publicClient?.waitForTransactionReceipt({ hash: approvalHash })
      }

      const hash = await writableMarketplace.createListing(
        payload.course.catalog.courseId,
        priceAmount,
        payload.duration
      )
      await publicClient?.waitForTransactionReceipt({ hash })
      toast.success('Listing created')
      refetch()
      closeListDialog()
    } catch (error: any) {
      console.error(error)
      toast.error(error?.shortMessage ?? 'Unable to create listing')
    }
  }

  if (!contractsConfigured) {
    return (
      <section className='mx-auto flex max-w-3xl flex-col gap-4 px-6 py-16 text-center'>
        <h1 className='text-3xl font-semibold text-foreground'>Marketplace not configured</h1>
        <p className='text-muted-foreground'>
          Provide marketplace and membership contract addresses via environment
          variables to enable this view.
        </p>
      </section>
    )
  }

  return (
    <section className='mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12'>
      <Hero
        listingCount={data?.reduce((acc, item) => acc + item.stats.listingCount, 0) ?? 0}
        canList={ownedCourses.length > 0}
        onListPass={handleListFromHero}
      />

      <div className='flex flex-col gap-8 lg:flex-row'>
        <aside className='w-full max-w-sm flex-shrink-0 space-y-6 rounded-3xl border border-border/60 bg-background/70 p-6 shadow-sm backdrop-blur'>
          <FilterControls
            filters={filters}
            onChange={setFilters}
            listingCount={data?.reduce((acc, row) => acc + row.stats.listingCount, 0) ?? 0}
          />

          <Separator />

          <div className='space-y-2 text-sm'>
            <p className='text-xs uppercase tracking-wide text-muted-foreground'>Primary price</p>
            <p className='text-lg font-semibold text-foreground'>{SUBSCRIPTION_PRICE_LABEL}</p>
            <p className='text-xs text-muted-foreground'>Settlement asset: USDC (Base)</p>
            <p className='pt-2 text-xs text-muted-foreground'>Treasury address</p>
            <p className='break-all text-sm text-foreground'>{PLATFORM_TREASURY_ADDRESS}</p>
            <p className='pt-2 text-xs text-muted-foreground'>Marketplace contract</p>
            <p className='break-all text-sm text-foreground'>{MARKETPLACE_CONTRACT_ADDRESS}</p>
          </div>
        </aside>

        <main className='flex-1 space-y-6'>
          {isLoading && (
            <div className='flex flex-col items-center gap-3 text-muted-foreground'>
              <LoadingIndicator />
              <p>Loading marketplace data…</p>
            </div>
          )}

          {!isLoading && ownedCourses.length > 0 && (
            <OwnedPassesCard passes={ownedCourses} onList={openListDialog} />
          )}

          {!isLoading && filteredCourses.length === 0 && (
            <p className='text-muted-foreground'>No courses match your filters.</p>
          )}

          {!isLoading && filteredCourses.length > 0 && (
            <div className='grid gap-6 md:grid-cols-2'>
              {filteredCourses.map(course => (
                <CourseCard
                  key={course.catalog.courseId.toString()}
                  course={course}
                  onBuyPrimary={handlePrimaryPurchase}
                  onBuyFloor={handleBuyFloor}
                  onList={openListDialog}
                  onRenew={handleRenew}
                />
              ))}
            </div>
          )}

          {data && data.some(entry => entry.listings.length > 0) && (
            <LiveListings data={data} />
          )}
        </main>
      </div>

      <ListDialog
        state={listDialog}
        onClose={closeListDialog}
        onSubmit={handleCreateListing}
        eligibleCourses={ownedCourses}
      />
    </section>
  )
}

function Hero({
  listingCount,
  canList,
  onListPass
}: {
  listingCount: number
  canList: boolean
  onListPass: () => void
}) {
  return (
    <div className='relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-10 py-14 text-white shadow-lg'>
      <div className='absolute -right-12 top-12 h-48 w-48 rounded-full bg-emerald-500/40 blur-3xl' />
      <div className='absolute -bottom-12 left-16 h-52 w-52 rounded-full bg-cyan-500/40 blur-3xl' />
      <div className='relative space-y-4'>
        <p className='inline-flex rounded-full bg-white/10 px-4 py-1 text-xs uppercase tracking-widest text-emerald-200'>
          Skillvesta Marketplace
        </p>
        <h1 className='text-4xl font-semibold sm:text-5xl'>Unlock, trade & renew course memberships</h1>
        <p className='max-w-2xl text-lg text-slate-200'>Buy new passes, discover secondary listings, or renew your existing memberships with cooldown-aware transfers and platform fees baked in.</p>
        <div className='flex flex-wrap gap-6 pt-2 text-sm text-slate-200'>
          <HeroStat label='Collections live' value='3+' />
          <HeroStat label='Active listings' value={String(listingCount)} />
          <HeroStat label='Settlement asset' value='USDC • Base Sepolia' />
        </div>
        <div className='flex flex-wrap items-center gap-3 pt-6'>
          <Button variant='secondary' onClick={onListPass} disabled={!canList}>
            List a membership
          </Button>
          {!canList && (
            <p className='text-xs text-slate-200/80'>
              Mint or purchase a pass to unlock listing.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-full border border-white/30 bg-white/10 px-4 py-2 backdrop-blur'>
      <p className='text-xs uppercase tracking-widest text-white/70'>{label}</p>
      <p className='text-base font-semibold text-white'>{value}</p>
    </div>
  )
}

function FilterControls({
  filters,
  listingCount,
  onChange
}: {
  filters: Filters
  listingCount: number
  onChange: (filters: Filters) => void
}) {
  return (
    <div className='space-y-4'>
      <div>
        <Label htmlFor='marketplace-search'>Search</Label>
        <Input
          id='marketplace-search'
          className='mt-2'
          placeholder='Search courses or tags'
          value={filters.search}
          onChange={event => onChange({ ...filters, search: event.target.value })}
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='marketplace-expiry'>Listing expiration</Label>
        <Select
          value={filters.expiry}
          onValueChange={value => onChange({ ...filters, expiry: value as ExpiryFilter })}
        >
          <SelectTrigger id='marketplace-expiry'>
            <SelectValue placeholder='Any expiration' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='any'>Any expiration</SelectItem>
            <SelectItem value='7d'>Ends within 7 days</SelectItem>
            <SelectItem value='30d'>Ends within 30 days</SelectItem>
            <SelectItem value='no-expiry'>No scheduled expiry</SelectItem>
          </SelectContent>
        </Select>
        <p className='text-xs text-muted-foreground'>
          Filter courses by when their live listings expire. Choose &ldquo;No scheduled expiry&rdquo; to
          see listings without a set end date.
        </p>
      </div>

      <label className='flex items-center gap-3 text-sm'>
        <input
          type='checkbox'
          className='h-4 w-4 rounded border-border'
          checked={filters.onlyListings}
          onChange={event => onChange({ ...filters, onlyListings: event.target.checked })}
        />
        Only show courses with live listings ({listingCount})
      </label>
    </div>
  )
}

function OwnedPassesCard({
  passes,
  onList
}: {
  passes: MarketplaceCourse[]
  onList: (course: MarketplaceCourse) => void
}) {
  return (
    <div className='space-y-4 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm'>
      <div>
        <h3 className='text-lg font-semibold text-foreground'>My memberships</h3>
        <p className='text-sm text-muted-foreground'>
          Active passes linked to your wallet. Cooldown timing shows when secondary listing unlocks.
        </p>
      </div>
      <div className='space-y-3'>
        {passes.map(pass => {
          const userState = pass.user
          const transferStatus = userState?.canTransfer
            ? 'Ready to transfer'
            : userState
            ? userState.transferAvailableAt === 0n
              ? 'Cooldown settling'
              : `Cooldown ends ${formatTimestampRelative(userState.transferAvailableAt)}`
            : 'Not available'
          const expiryStatus = userState
            ? userState.expiresAt === 0n
              ? 'No expiry scheduled'
              : formatTimestampRelative(userState.expiresAt)
            : '—'

          return (
            <div
              key={pass.catalog.courseId.toString()}
              className='flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/40 bg-muted/30 p-4'
            >
              <div className='space-y-1'>
                <p className='text-sm font-semibold text-foreground'>
                  {pass.catalog.title}
                </p>
                <p className='text-xs text-muted-foreground'>
                  Membership #{pass.catalog.courseId.toString()}
                </p>
                <p className='text-xs text-muted-foreground'>
                  Expires {expiryStatus} • Transfer {transferStatus}
                </p>
              </div>
              <Button
                size='sm'
                variant='outline'
                onClick={() => onList(pass)}
                title={transferStatus}
              >
                List pass
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CourseCard({
  course,
  onBuyPrimary,
  onBuyFloor,
  onList,
  onRenew
}: {
  course: MarketplaceCourse
  onBuyPrimary: (course: MarketplaceCourse) => void
  onBuyFloor: (course: MarketplaceCourse) => void
  onList: (course: MarketplaceCourse) => void
  onRenew: (course: MarketplaceCourse) => void
}) {
  const tags = course.catalog.tags
  const nextListingExpiry = getNextListingExpiry(course.listings)
  const nextListingExpiryLabel =
    course.listings.length === 0
      ? '—'
      : nextListingExpiry
      ? formatTimestampRelative(nextListingExpiry)
      : 'No expiry'
  const userState = course.user
  const userHasPass = Boolean(userState?.hasPass)
  const transferReadyLabel = userState?.hasPass
    ? userState.canTransfer
      ? 'Now'
      : formatTimestampRelative(userState.transferAvailableAt)
    : '—'
  const userExpiryLabel = userState?.hasPass ? formatTimestampRelative(userState.expiresAt) : '—'
  const listTooltip = !userHasPass
    ? 'Mint a membership pass before listing.'
    : userState && !userState.canTransfer
      ? `Transfer cooldown ends ${formatTimestampRelative(userState.transferAvailableAt)}`
      : undefined

  return (
    <div className='flex h-full flex-col justify-between rounded-3xl border border-border/60 bg-background/80 shadow-sm backdrop-blur'>
      <div className={`h-32 rounded-t-3xl bg-gradient-to-r ${course.catalog.coverGradient}`} />
      <div className='flex flex-1 flex-col gap-4 px-6 py-6'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-xs uppercase tracking-wide text-muted-foreground'>
              Membership pass #{course.catalog.courseId.toString()}
            </p>
            <h2 className='mt-1 text-xl font-semibold text-foreground'>
              {course.catalog.title}
            </h2>
            <p className='text-sm text-muted-foreground'>{course.catalog.subtitle}</p>
          </div>
          <div className='text-right text-sm'>
            <p className='text-xs text-muted-foreground'>Primary price</p>
            <p className='font-semibold text-foreground'>{formatUSDC(course.stats.primaryPrice)}</p>
            {course.floorPrice && (
              <p className='text-xs text-muted-foreground'>Floor {formatUSDC(course.floorPrice)}</p>
            )}
          </div>
        </div>

        <p className='text-sm text-muted-foreground'>{course.catalog.summary}</p>

        <div className='flex flex-wrap gap-2 text-xs text-muted-foreground'>
          {tags.map(tag => (
            <span key={tag} className='rounded-full border border-border px-3 py-1'>
              {tag}
            </span>
          ))}
        </div>

        <dl className='grid gap-3 rounded-2xl bg-muted/50 p-4 text-sm sm:grid-cols-2'>
          <StatItem label='Live listings' value={String(course.stats.listingCount)} />
          <StatItem label='Membership duration' value={formatDurationShort(course.stats.duration)} />
          <StatItem label='Transfer cooldown' value={formatDurationShort(course.stats.cooldown)} />
          <StatItem label='Next listing expiry' value={nextListingExpiryLabel} />
          <StatItem label='Transfer ready' value={transferReadyLabel} />
          <StatItem label='Your pass expiry' value={userExpiryLabel} />
        </dl>

        {course.listings.length > 0 && (
          <div className='space-y-2 rounded-2xl border border-dashed border-border/60 bg-muted/30 p-4 text-xs'>
            <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
              Active listings
            </p>
            <div className='space-y-1'>
              {course.listings.map(listing => (
                <div
                  key={`${listing.seller}-${listing.listedAt.toString()}`}
                  className='flex flex-wrap items-center justify-between gap-2 text-muted-foreground'
                >
                  <span className='font-mono text-[0.7rem] text-foreground'>
                    {shortenAddress(listing.seller)}
                  </span>
                  <span>
                    {formatUSDC(listing.priceUSDC)} •{' '}
                    {listing.expiresAt === 0n
                      ? 'No expiry'
                      : `Expires ${formatTimestampRelative(listing.expiresAt)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className='flex flex-wrap gap-2 pt-2'>
          <Button className='flex-1' onClick={() => onBuyPrimary(course)}>
            Buy new pass
          </Button>
          <Button
            className='flex-1'
            variant='secondary'
            disabled={course.listings.length === 0}
            onClick={() => onBuyFloor(course)}
          >
            Buy floor
          </Button>
          <Button
            className='flex-1'
            variant='outline'
            disabled={!userHasPass}
            title={listTooltip}
            onClick={() => onList(course)}
          >
            List pass
          </Button>
          <Button
            className='flex-1'
            variant='ghost'
            disabled={!userHasPass}
            onClick={() => onRenew(course)}
          >
            Renew
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='font-medium text-foreground'>{value}</dd>
    </div>
  )
}

function LiveListings({ data }: { data: MarketplaceCourse[] }) {
  const listings = data.flatMap(entry =>
    entry.listings.map(listing => ({ listing, course: entry.catalog }))
  )

  if (listings.length === 0) return null

  return (
    <div className='space-y-4 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm'>
      <div>
        <h3 className='text-lg font-semibold text-foreground'>Live listings</h3>
        <p className='text-sm text-muted-foreground'>Secondary market opportunities across all courses.</p>
      </div>
      <ScrollArea className='h-[360px]'>
        <div className='space-y-4 pr-4'>
          {listings.map(({ listing, course }) => (
            <div
              key={`${course.courseId.toString()}-${listing.seller}-${listing.listedAt.toString()}`}
              className='rounded-2xl border border-border/40 bg-muted/40 p-4 text-sm'
            >
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div>
                  <p className='font-semibold text-foreground'>{course.title}</p>
                  <p className='text-xs text-muted-foreground'>
                    Seller {listing.seller} • Listed {formatTimestampRelative(listing.listedAt)}
                  </p>
                </div>
                <p className='text-base font-semibold text-foreground'>
                  {formatUSDC(listing.priceUSDC)}
                </p>
              </div>
              <p className='text-xs text-muted-foreground'>
                {listing.expiresAt === 0n
                  ? 'No expiry scheduled'
                  : `Expires ${formatTimestampRelative(listing.expiresAt)}`}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function ListDialog({
  state,
  onClose,
  onSubmit,
  eligibleCourses
}: {
  state: { open: boolean; course?: MarketplaceCourse }
  onClose: () => void
  onSubmit: (payload: { price: string; duration: bigint; course: MarketplaceCourse }) => Promise<void>
  eligibleCourses: MarketplaceCourse[]
}) {
  const [price, setPrice] = useState(SUBSCRIPTION_PRICE_USDC)
  const [duration, setDuration] = useState<bigint>(DEFAULT_LISTING_DURATION)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<MarketplaceCourse | undefined>(state.course)

  useEffect(() => {
    if (state.open) {
      setPrice(SUBSCRIPTION_PRICE_USDC)
      setDuration(DEFAULT_LISTING_DURATION)
      const fallback = state.course ?? eligibleCourses[0]
      setSelectedCourse(fallback)
    }
  }, [state.open, state.course, eligibleCourses])

  const handleCourseChange = (courseId: string) => {
    const nextCourse = eligibleCourses.find(
      entry => entry.catalog.courseId.toString() === courseId
    )
    setSelectedCourse(nextCourse)
  }

  const handleSubmit = async () => {
    if (!selectedCourse) return
    setIsSubmitting(true)
    try {
      await onSubmit({ price, duration, course: selectedCourse })
    } finally {
      setIsSubmitting(false)
    }
  }

  const transferStatus = selectedCourse?.user
    ? selectedCourse.user.canTransfer
      ? 'ready now'
      : `available ${formatTimestampRelative(selectedCourse.user.transferAvailableAt)}`
    : null
  const passExpiryStatus = selectedCourse?.user?.hasPass
    ? formatTimestampRelative(selectedCourse.user.expiresAt)
    : '—'

  return (
    <Dialog open={state.open} onOpenChange={open => (!open ? onClose() : null)}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>List membership for sale</DialogTitle>
          <DialogDescription>
            Set your price and listing duration. Marketplace fees apply on settlement.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {eligibleCourses.length > 1 && (
            <div className='space-y-2'>
              <Label htmlFor='listing-course'>Membership</Label>
              <Select
                value={selectedCourse?.catalog.courseId.toString() ?? ''}
                onValueChange={handleCourseChange}
              >
                <SelectTrigger id='listing-course'>
                  <SelectValue placeholder='Choose a membership' />
                </SelectTrigger>
                <SelectContent>
                  {eligibleCourses.map(option => (
                    <SelectItem
                      key={option.catalog.courseId.toString()}
                      value={option.catalog.courseId.toString()}
                    >
                      {option.catalog.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className='rounded-2xl bg-muted/40 p-4 text-sm'>
            {selectedCourse ? (
              <>
                <p className='font-medium text-foreground'>{selectedCourse.catalog.title}</p>
                <p className='text-muted-foreground'>
                  Transfer status {transferStatus ?? 'unavailable'}
                </p>
                <p className='text-muted-foreground'>
                  Pass expires {passExpiryStatus}
                </p>
                <p className='text-muted-foreground'>
                  Cooldown {formatDurationShort(selectedCourse.stats.cooldown)}
                </p>
              </>
            ) : (
              <p className='text-muted-foreground'>
                No memberships are ready to list. Mint a pass or wait for the transfer cooldown to
                end.
              </p>
            )}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='listing-price'>Listing price (USDC)</Label>
            <Input
              id='listing-price'
              type='number'
              min='0'
              step='0.01'
              value={price}
              onChange={event => setPrice(event.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label>Listing duration</Label>
            <Select
              value={duration.toString()}
              onValueChange={value => setDuration(BigInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select duration' />
              </SelectTrigger>
              <SelectContent>
                {LISTING_DURATION_CHOICES.map(option => (
                  <SelectItem key={option.label} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant='ghost' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedCourse}>
            {isSubmitting ? 'Listing...' : 'Create listing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
