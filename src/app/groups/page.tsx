'use client'

import Link from 'next/link'
import { useEffect } from 'react'

import { useMutation } from 'convex/react'
import { ArrowLeft } from 'lucide-react'
import { useAccount } from 'wagmi'

import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { GroupDirectory } from '@/features/groups/components/group-directory'

export default function GroupsPage() {
  const { address } = useAccount()
  const storeUser = useMutation(api.users.store)

  useEffect(() => {
    if (!address) return
    storeUser({ address }).catch(() => {
      /* ignore duplicate upsert errors */
    })
  }, [address, storeUser])

  return (
    <main className='mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-10 px-6 pb-24 pt-16 sm:pt-20'>
      <div className='flex flex-col gap-3'>
        <Button asChild variant='ghost' size='sm' className='w-auto px-0 text-muted-foreground hover:text-foreground'>
          <Link href='/'>
            <ArrowLeft className='mr-2 h-4 w-4' aria-hidden='true' />
            Back to home
          </Link>
        </Button>
        <h1 className='text-3xl font-semibold text-foreground sm:text-4xl'>Your groups</h1>
        <p className='max-w-2xl text-sm text-muted-foreground'>
          Connect your wallet to instantly load every community you manage or participate in. Use the directory below to
          jump straight into a group or open its marketplace listing.
        </p>
      </div>

      <section className='flex flex-1 flex-col gap-6'>
        <GroupDirectory />
      </section>
    </main>
  )
}
