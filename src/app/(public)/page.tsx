'use client'

import { useEffect } from 'react'

import { useMutation } from 'convex/react'
import { useAccount } from 'wagmi'

import { api } from '@/convex/_generated/api'
import { GroupDirectory } from '@/features/groups/components/group-directory'

export default function HomePage() {
  const { address } = useAccount()
  const storeUser = useMutation(api.users.store)

  useEffect(() => {
    if (!address) return
    storeUser({ address }).catch(() => {
      /* ignore duplicate upsert errors */
    })
  }, [address, storeUser])

  return (
    <div className='mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-12 px-6 py-16'>
      <section className='space-y-3'>
        <h1 className='text-3xl font-semibold text-foreground sm:text-4xl'>
          Discover and manage your Skillvesta communities
        </h1>
        <p className='max-w-2xl text-sm text-muted-foreground'>
          Browse groups you belong to or start something new. Everything is
          powered by Base smart wallets.
        </p>
      </section>

      <GroupDirectory />
    </div>
  )
}
