'use client'

import { useEffect, useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { parseUnits, type Address } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'

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

type Filters = {
  search: string
  category: string
  difficulty: string
  onlyListings: boolean
}

const defaultFilters: Filters = {
  search: '',
  category: 'all',
  difficulty: 'all',
  onlyListings: false
}

export function MarketplaceShell() {
  const catalog = useMemo(() => getCourseCatalog(), [])
  const categories = useMemo(
    () => ['all', ...new Set(catalog.map(item => item.category))],
    [catalog]
  )
  const difficulties = useMemo(
    () => ['all', ...new Set(catalog.map(item => item.difficulty.toLowerCase()))],
    [catalog]
  )

  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [listDialog, setListDialog] = useState<{ open: boolean; course?: MarketplaceCourse }>(
    { open: false }
  )

  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const { data: walletClient } = useWalletClient()
  const { address } = useAccount()

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
    queryKey: ['marketplace-feed', marketplaceAddress, membershipAddress, address],
    enabled: Boolean(readOnlyMarketplace && readOnlyMembership),
    queryFn: async (): Promise<MarketplaceCourse[]> => {
      if (!readOnlyMarketplace || !readOnlyMembership) return []

      return Promise.all(
        catalog.map(async catalogItem => {
          const courseId = catalogItem.courseId
          const [courseConfig, listings] = await Promise.all([
            readOnlyMembership.getCourse(courseId),
            readOnlyMarketplace.getActiveListings(courseId)
          ])

          let userState: MarketplaceCourse['user']
          if (address) {
            const [hasPass, transferInfo, passState] = await Promise.all([
              readOnlyMembership.isPassActive(courseId, address as Address),
              readOnlyMembership.canTransfer(courseId, address as Address),
              readOnlyMembership.getPassState(courseId, address as Address)
            ])

            userState = {
              hasPass,
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
          }
        })
      )
    },
    refetchInterval: 30_000
  })

  const filteredCourses = useMemo(() => {
    if (!data) return []
    const term = filters.search.trim().toLowerCase()

    return data.filter(entry => {
      if (filters.onlyListings && entry.stats.listingCount === 0) return false
      if (filters.category !== 'all' && entry.catalog.category !== filters.category) return false
      if (
        filters.difficulty !== 'all' &&
        entry.catalog.difficulty.toLowerCase() !== filters.difficulty
      )
        return false
      if (!term) return true

      return (
        entry.catalog.title.toLowerCase().includes(term) ||
        entry.catalog.summary.toLowerCase().includes(term) ||
        entry.catalog.tags.some(tag => tag.toLowerCase().includes(term))
      )
    })
  }, [data, filters])

  const contractsConfigured = Boolean(marketplaceAddress && membershipAddress)

  const openListDialog = (course: MarketplaceCourse) => {
    setListDialog({ open: true, course })
  }

  const closeListDialog = () => setListDialog({ open: false })

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
      <Hero listingCount={data?.reduce((acc, item) => acc + item.stats.listingCount, 0) ?? 0} />

      <div className='flex flex-col gap-8 lg:flex-row'>
        <aside className='w-full max-w-sm flex-shrink-0 space-y-6 rounded-3xl border border-border/60 bg-background/70 p-6 shadow-sm backdrop-blur'>
          <FilterControls
            filters={filters}
            categories={categories}
            difficulties={difficulties}
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
          {isLoading && <p className='text-muted-foreground'>Loading marketplace data…</p>}

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

      <ListDialog state={listDialog} onClose={closeListDialog} onSubmit={handleCreateListing} />
    </section>
  )
}

function Hero({ listingCount }: { listingCount: number }) {
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
  categories,
  difficulties,
  listingCount,
  onChange
}: {
  filters: Filters
  categories: string[]
  difficulties: string[]
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
        <Label>Category</Label>
        <Select
          value={filters.category}
          onValueChange={value => onChange({ ...filters, category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder='All categories' />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='space-y-2'>
        <Label>Difficulty</Label>
        <Select
          value={filters.difficulty}
          onValueChange={value => onChange({ ...filters, difficulty: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder='All levels' />
          </SelectTrigger>
          <SelectContent>
            {difficulties.map(level => (
              <SelectItem key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

  return (
    <div className='flex h-full flex-col justify-between rounded-3xl border border-border/60 bg-background/80 shadow-sm backdrop-blur'>
      <div className={`h-32 rounded-t-3xl bg-gradient-to-r ${course.catalog.coverGradient}`} />
      <div className='flex flex-1 flex-col gap-4 px-6 py-6'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <p className='text-xs uppercase tracking-wide text-muted-foreground'>
              {course.catalog.category} • {course.catalog.difficulty}
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
          <StatItem
            label='Your expiry'
            value={course.user?.hasPass ? formatTimestampRelative(course.user.expiresAt) : '—'}
          />
        </dl>

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
            disabled={!course.user?.hasPass}
            onClick={() => onList(course)}
          >
            List pass
          </Button>
          <Button
            className='flex-1'
            variant='ghost'
            disabled={!course.user?.hasPass}
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
              {listing.expiresAt !== 0n && (
                <p className='text-xs text-muted-foreground'>Expires {formatTimestampRelative(listing.expiresAt)}</p>
              )}
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
  onSubmit
}: {
  state: { open: boolean; course?: MarketplaceCourse }
  onClose: () => void
  onSubmit: (payload: { price: string; duration: bigint; course: MarketplaceCourse }) => Promise<void>
}) {
  const [price, setPrice] = useState(SUBSCRIPTION_PRICE_USDC)
  const [duration, setDuration] = useState<bigint>(DEFAULT_LISTING_DURATION)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (state.open) {
      setPrice(SUBSCRIPTION_PRICE_USDC)
      setDuration(DEFAULT_LISTING_DURATION)
    }
  }, [state.open])

  const handleSubmit = async () => {
    if (!state.course) return
    setIsSubmitting(true)
    try {
      await onSubmit({ price, duration, course: state.course })
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <div className='rounded-2xl bg-muted/40 p-4 text-sm'>
            <p className='font-medium text-foreground'>{state.course?.catalog.title}</p>
            <p className='text-muted-foreground'>Cooldown {formatDurationShort(state.course?.stats.cooldown ?? 0n)}</p>
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
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Listing…' : 'Create listing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
