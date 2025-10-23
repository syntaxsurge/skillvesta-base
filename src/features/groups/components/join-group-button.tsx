'use client'

import { useState } from 'react'

import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { erc20Abi, parseUnits } from 'viem'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'

import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import { USDC_CONTRACT_ADDRESS } from '@/lib/config'
import { ACTIVE_CHAIN } from '@/lib/wagmi'
import { useGroupContext } from '../context/group-context'
import { formatGroupPriceLabel } from '../utils/price'

export function JoinGroupButton() {
  const { group, owner, isOwner, isMember } = useGroupContext()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const joinGroup = useMutation(api.groups.join)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const usdcAddress = USDC_CONTRACT_ADDRESS as `0x${string}` | null

  if (isOwner) {
    return (
      <Button className='w-full' variant='secondary' disabled>
        You own this group
      </Button>
    )
  }

  if (isMember) {
    return (
      <Button className='w-full' variant='outline' disabled>
        You&apos;re a member
      </Button>
    )
  }

  const handleJoin = async () => {
    if (!address) {
      toast.error('Connect your wallet to join this group.')
      return
    }

    if (!owner?.walletAddress) {
      toast.error('Group owner wallet not available.')
      return
    }

    if (!publicClient) {
      toast.error('Blockchain client unavailable. Please try again.')
      return
    }

    const price = group.price ?? 0
    let txHash: `0x${string}` | undefined

    if (price > 0 && !usdcAddress) {
      toast.error('USDC contract address not configured.')
      return
    }

    try {
      setIsSubmitting(true)

      if (price > 0) {
        const amount = parseUnits(price.toString(), 6)
        const balance = (await publicClient.readContract({
          address: usdcAddress!,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address]
        })) as bigint

        if (balance < amount) {
          toast.error('Insufficient USDC balance to join this group.')
          return
        }

        const hash = await writeContractAsync({
          address: usdcAddress!,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [owner.walletAddress as `0x${string}`, amount]
        })

        txHash = hash
        await publicClient.waitForTransactionReceipt({ hash })
      }

      await joinGroup({
        groupId: group._id,
        memberAddress: address,
        txHash
      })

      toast.success('Welcome aboard! You now have access to this group.')
    } catch (error) {
      console.error('Failed to join group', error)
      toast.error('Joining failed. Please retry in a moment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttonLabel =
    group.price && group.price > 0
      ? `Join ${formatGroupPriceLabel(group.price, group.billingCadence, {
          includeCadence: true
        })}`
      : 'Join for free'

  return (
    <Button
      className='w-full'
      disabled={isSubmitting}
      onClick={handleJoin}
    >
      {isSubmitting ? 'Processing...' : buttonLabel}
    </Button>
  )
}
