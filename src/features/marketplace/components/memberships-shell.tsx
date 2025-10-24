'use client'
import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import {
  ListDialog,
  OwnedPassesCard,
  useMarketplaceCore
} from '@/features/marketplace/components/marketplace-shell'

export function MembershipsShell() {
  const {
    isLoading,
    ownedCourses,
    listDialog,
    openListDialog,
    closeListDialog,
    handleCreateListing,
    contractsConfigured
  } = useMarketplaceCore()

  if (!contractsConfigured) {
    return (
      <section className='mx-auto flex max-w-3xl flex-col gap-4 px-6 py-16 text-center'>
        <h1 className='text-3xl font-semibold text-foreground'>
          Marketplace not configured
        </h1>
        <p className='text-muted-foreground'>
          Provide marketplace and membership contract addresses via environment
          variables to enable listings.
        </p>
      </section>
    )
  }

  return (
    <section className='mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12'>
      <div className='space-y-2'>
        <h1 className='text-3xl font-semibold text-foreground'>
          My memberships
        </h1>
        <p className='text-sm text-muted-foreground'>
          Review every pass owned by the connected wallet. Cooldown timing tells
          you when listing or transfer unlocks.
        </p>
      </div>

      {isLoading && (
        <div className='flex flex-col items-center gap-3 text-muted-foreground'>
          <LoadingIndicator />
          <p>Loading memberships…</p>
        </div>
      )}

      {!isLoading && ownedCourses.length === 0 && (
        <p className='text-muted-foreground'>
          No memberships detected. Purchase a pass to see it here.
        </p>
      )}

      {!isLoading && ownedCourses.length > 0 && (
        <OwnedPassesCard passes={ownedCourses} onList={openListDialog} />
      )}

      <ListDialog
        state={listDialog}
        onClose={closeListDialog}
        onSubmit={handleCreateListing}
        eligibleCourses={ownedCourses}
      />
    </section>
  )
}
