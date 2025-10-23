'use client'

import { useMemo, useState } from 'react'

import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { erc20Abi, maxUint256, parseUnits } from 'viem'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'

import { Button } from '@/components/ui/button'
import { api } from '@/convex/_generated/api'
import {
  REVENUE_SPLIT_ROUTER_ADDRESS,
  USDC_CONTRACT_ADDRESS
} from '@/lib/config'
import { revenueSplitRouterAbi } from '@/lib/onchain/abi'
import { ACTIVE_CHAIN } from '@/lib/wagmi'
import { useGroupContext } from '../context/group-context'
import { formatGroupPriceLabel } from '../utils/price'

export function JoinGroupButton() {
  const { group, owner, isOwner, isMember, administrators } = useGroupContext()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const joinGroup = useMutation(api.groups.join)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const usdcAddress = USDC_CONTRACT_ADDRESS as `0x${string}` | null
  const routerAddress = REVENUE_SPLIT_ROUTER_ADDRESS as `0x${string}` | ''

  const revenueSplits = useMemo(() => {
    if (!owner?.walletAddress) {
      return null
    }

    const normalizedOwner = owner.walletAddress as `0x${string}`
    const recipients: `0x${string}`[] = []
    const shares: number[] = []

    const validAdmins = administrators.filter(admin => admin.shareBps > 0)

    let adminShareTotal = 0
    validAdmins.forEach(admin => {
      const wallet = admin.user.walletAddress as `0x${string}`
      recipients.push(wallet)
      shares.push(admin.shareBps)
      adminShareTotal += admin.shareBps
    })

    const normalizedAdminShare = Math.min(adminShareTotal, 10000)
    const ownerShare = Math.max(0, 10000 - normalizedAdminShare)

    if (ownerShare > 0 || recipients.length === 0) {
      recipients.push(normalizedOwner)
      shares.push(ownerShare > 0 ? ownerShare : 10000)
    }

    const totalShare = shares.reduce((total, value) => total + value, 0)
    if (totalShare !== 10000 && shares.length > 0) {
      const diff = 10000 - totalShare
      shares[shares.length - 1] = Math.max(0, shares[shares.length - 1] + diff)
    }

    return {
      recipients,
      shares
    }
  }, [administrators, owner?.walletAddress])

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
    if (price > 0 && !routerAddress) {
      toast.error('Revenue split router contract not configured.')
      return
    }

    try {
      setIsSubmitting(true)

      if (price > 0) {
        if (
          !revenueSplits ||
          revenueSplits.recipients.length === 0 ||
          revenueSplits.recipients.length !== revenueSplits.shares.length
        ) {
          toast.error('Revenue shares are not configured correctly.')
          return
        }

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

        const resolvedRouter = routerAddress as `0x${string}`

        const allowance = (await publicClient.readContract({
          address: usdcAddress!,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, resolvedRouter]
        })) as bigint

        if (allowance < amount) {
          const approvalHash = await writeContractAsync({
            address: usdcAddress!,
            abi: erc20Abi,
            functionName: 'approve',
            args: [resolvedRouter, maxUint256]
          })
          await publicClient.waitForTransactionReceipt({ hash: approvalHash })
        }

        const hash = await writeContractAsync({
          address: resolvedRouter,
          abi: revenueSplitRouterAbi,
          functionName: 'splitTransfer',
          args: [
            usdcAddress!,
            revenueSplits.recipients,
            revenueSplits.shares,
            amount
          ]
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
