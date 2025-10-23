'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { erc20Abi } from 'viem'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'

import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import { PLATFORM_TREASURY_ADDRESS, USDC_CONTRACT_ADDRESS } from '@/lib/config'
import {
  SUBSCRIPTION_PRICE_AMOUNT,
  SUBSCRIPTION_PRICE_LABEL
} from '@/lib/pricing'
import { ACTIVE_CHAIN } from '@/lib/wagmi'

const Create = () => {
  const router = useRouter()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const createGroup = useMutation(api.groups.create)

  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const treasuryAddress = PLATFORM_TREASURY_ADDRESS as `0x${string}` | ''
  const usdcTokenAddress = USDC_CONTRACT_ADDRESS as `0x${string}`
  const paymentAmount = SUBSCRIPTION_PRICE_AMOUNT

  const handleCreate = async () => {
    let txHash: `0x${string}` | null = null

    if (!address) {
      toast.error('Connect your wallet to continue')
      return
    }

    if (!name.trim()) {
      toast.error('Group name is required')
      return
    }

    if (!treasuryAddress) {
      toast.error('Treasury address not configured')
      return
    }

    if (!publicClient) {
      toast.error('Blockchain client unavailable. Please try again.')
      return
    }

    try {
      setIsSubmitting(true)

      const balance = (await publicClient.readContract({
        address: usdcTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address]
      })) as bigint

      if (balance < paymentAmount) {
        toast.error(
          `Insufficient USDC balance. You need ${SUBSCRIPTION_PRICE_LABEL}.`
        )
        return
      }

      const hash = await writeContractAsync({
        address: usdcTokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [treasuryAddress, paymentAmount]
      })
      txHash = hash

      await publicClient.waitForTransactionReceipt({ hash })

      const groupId = await createGroup({
        ownerAddress: address,
        name
      })

      toast.success('Your group is live!')
      router.push(`/${groupId}`)
    } catch (error: any) {
      console.error('Failed to complete group creation', error)
      const message =
        txHash !== null
          ? 'Group created payment succeeded but the finalization failed. Please refresh — your group may appear shortly.'
          : 'Payment failed. Please try again.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='flex h-full items-center justify-center text-xl'>
      <div className='flex h-[450px] max-w-[550px] flex-col justify-between'>
        <Logo />
        <p className='font-bold'>
          🌟 Empower your community and generate income online effortlessly.
        </p>
        <p>🚀 Drive exceptional engagement</p>
        <p>💖 Set up seamlessly</p>
        <p>😄 Enjoy a delightful user experience</p>
        <p>💸 Monetize through Base-native membership fees</p>
        <p>📱 Accessible via iOS and Android apps</p>
        <p>🌍 Connect with millions of daily users around the globe</p>
      </div>

      <div className='flex h-[450px] max-w-[550px] flex-col justify-between rounded-lg p-16 shadow-xl'>
        <h2 className='font-bold'>Create a group</h2>
        <p className='text-sm'>
          {SUBSCRIPTION_PRICE_LABEL}. Cancel anytime hassle-free. Access all
          features with unlimited usage and no hidden charges.
        </p>
        <Input
          placeholder='Group name'
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Create'}
        </Button>
      </div>
    </div>
  )
}

export default Create
