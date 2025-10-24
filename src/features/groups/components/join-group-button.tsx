'use client'

import { useEffect, useMemo, useState } from 'react'

import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { Address, erc20Abi, maxUint256, parseUnits } from 'viem'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { api } from '@/convex/_generated/api'
import {
  MARKETPLACE_CONTRACT_ADDRESS,
  MEMBERSHIP_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS
} from '@/lib/config'
import { membershipMarketplaceAbi } from '@/lib/onchain/abi'
import { MembershipPassService } from '@/lib/onchain/services/membershipPassService'
import { ACTIVE_CHAIN } from '@/lib/wagmi'
import { formatTimestampRelative } from '@/lib/time'
import { useGroupContext } from '../context/group-context'
import { normalizePassExpiry, resolveMembershipCourseId } from '../utils/membership'
import { formatGroupPriceLabel } from '../utils/price'

export function JoinGroupButton() {
  const { group, owner, isOwner, isMember, membership } = useGroupContext()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const joinGroup = useMutation(api.groups.join)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const usdcAddress = USDC_CONTRACT_ADDRESS as `0x${string}` | null
  const marketplaceAddress = MARKETPLACE_CONTRACT_ADDRESS as `0x${string}` | null
  const membershipAddress = MEMBERSHIP_CONTRACT_ADDRESS as `0x${string}` | null
  const membershipService = useMemo(() => {
    if (!publicClient || !membershipAddress) return null
    return new MembershipPassService({
      publicClient: publicClient as any,
      address: membershipAddress
    })
  }, [publicClient, membershipAddress])
  const membershipCourseId = useMemo(() => resolveMembershipCourseId(group), [group])

  if (isOwner) {
    return (
      <Button className='w-full' variant='secondary' disabled>
        You own this group
      </Button>
    )
  }

  if (isMember) {
    return <LeaveGroupButton membershipService={membershipService} courseId={membershipCourseId} />
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
    const requiresPayment = price > 0
    let txHash: `0x${string}` | undefined
    let skipPayment = false
    let passExpiryMs: number | undefined

    if (requiresPayment && !usdcAddress) {
      toast.error('USDC contract address not configured.')
      return
    }
    const candidateMarketplaceAddress = marketplaceAddress ?? undefined
    const candidateCourseId = membershipCourseId ?? undefined
    if (requiresPayment && !candidateMarketplaceAddress) {
      toast.error('Marketplace contract address not configured.')
      return
    }
    if (requiresPayment && !candidateCourseId) {
      toast.error('Membership course configuration missing. Contact the group owner.')
      return
    }
    if (requiresPayment && !membershipService) {
      toast.error('Membership contract address not configured.')
      return
    }

    try {
      setIsSubmitting(true)

      if (requiresPayment && membershipService && candidateCourseId && address) {
        const courseIdStrict = candidateCourseId
        try {
          const [active, state] = await Promise.all([
            membershipService.isPassActive(courseIdStrict, address as Address),
            membershipService.getPassState(courseIdStrict, address as Address)
          ])

          if (active) {
            skipPayment = true
            passExpiryMs = normalizePassExpiry(state.expiresAt)
            toast.info('Membership pass detected. Rejoining without payment.')
          }
        } catch (error) {
          console.error('Failed to verify membership pass', error)
        }
      }

      if (
        requiresPayment &&
        !skipPayment &&
        membership?.passExpiresAt &&
        membership.passExpiresAt > Date.now()
      ) {
        skipPayment = true
        passExpiryMs = membership.passExpiresAt
      }

      if (requiresPayment && !skipPayment) {
        const marketplaceAddressStrict = candidateMarketplaceAddress as `0x${string}`
        const courseIdStrict = candidateCourseId as bigint
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

        const allowance = (await publicClient.readContract({
          address: usdcAddress!,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, marketplaceAddressStrict]
        })) as bigint

        if (allowance < amount) {
          const approvalHash = await writeContractAsync({
            address: usdcAddress!,
            abi: erc20Abi,
            functionName: 'approve',
            args: [marketplaceAddressStrict, maxUint256]
          })
          await publicClient.waitForTransactionReceipt({ hash: approvalHash })
        }

        const hash = await writeContractAsync({
          address: marketplaceAddressStrict,
          abi: membershipMarketplaceAbi,
          functionName: 'purchasePrimary',
          args: [courseIdStrict, amount]
        })

        txHash = hash
        await publicClient.waitForTransactionReceipt({ hash })

        try {
          const state = await membershipService!.getPassState(courseIdStrict, address as Address)
          passExpiryMs = normalizePassExpiry(state.expiresAt) ?? passExpiryMs
          const hasPassNow = await membershipService!.isPassActive(courseIdStrict, address as Address)
          if (!hasPassNow) {
            throw new Error('Membership pass not detected after purchase.')
          }
        } catch (error) {
          console.error('Failed to verify membership pass after purchase', error)
          toast.error(
            'Payment succeeded, but the membership pass could not be confirmed. Please try again or contact support.'
          )
          return
        }
      }

      await joinGroup({
        groupId: group._id,
        memberAddress: address,
        txHash,
        hasActivePass: skipPayment,
        passExpiresAt: passExpiryMs
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

type LeaveGroupButtonProps = {
  membershipService: MembershipPassService | null
  courseId: bigint | null
}

function LeaveGroupButton({ membershipService, courseId }: LeaveGroupButtonProps) {
  const { group, membership } = useGroupContext()
  const { address } = useAccount()
  const leaveGroup = useMutation(api.groups.leave)
  const [isLeaving, setIsLeaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resolvedExpiryMs, setResolvedExpiryMs] = useState<number | undefined>(
    membership?.passExpiresAt
  )
  const [isCheckingExpiry, setIsCheckingExpiry] = useState(false)

  const isFreeGroup = (group.price ?? 0) === 0

  const handleLeave = async () => {
    if (!address) {
      toast.error('Connect your wallet to manage memberships.')
      return
    }

    try {
      setIsLeaving(true)
      let passExpiryMs = resolvedExpiryMs ?? membership?.passExpiresAt

      await leaveGroup({
        groupId: group._id,
        memberAddress: address,
        passExpiresAt: passExpiryMs
      })

      toast.success('You have left this group.')
      setDialogOpen(false)
    } catch (error) {
      console.error('Failed to leave group', error)
      toast.error('Unable to leave the group right now.')
    } finally {
      setIsLeaving(false)
    }
  }

  useEffect(() => {
    if (
      !dialogOpen ||
      isFreeGroup ||
      !membershipService ||
      !courseId ||
      !address ||
      typeof window === 'undefined'
    ) {
      return
    }

    let cancelled = false
    setIsCheckingExpiry(true)
    membershipService
      .getPassState(courseId, address as Address)
      .then(state => normalizePassExpiry(state.expiresAt))
      .then(expiryMs => {
        if (!cancelled && expiryMs) {
          setResolvedExpiryMs(expiryMs)
        }
      })
      .catch(error => {
        console.error('Failed to resolve pass state before leaving', error)
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingExpiry(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [dialogOpen, isFreeGroup, membershipService, courseId, address])

  const expirySeconds = resolvedExpiryMs ? Math.floor(resolvedExpiryMs / 1000) : null
  const expiryDisplay =
    !isFreeGroup && resolvedExpiryMs
      ? formatTimestampRelative(expirySeconds ?? 0)
      : 'No active expiry found'

  return (
    <>
      <Button
        className='w-full'
        variant='outline'
        onClick={() => setDialogOpen(true)}
        disabled={isLeaving}
      >
        {isLeaving ? 'Leaving...' : 'Leave group'}
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={open => {
          if (!isLeaving) {
            setDialogOpen(open)
          }
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Leave {group.name}</DialogTitle>
            <DialogDescription>
              Leaving removes your access immediately. Review the details before you continue.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 text-sm text-muted-foreground'>
            {isFreeGroup ? (
              <p>
                This group is free. Leaving will simply hide the content from your dashboard until
                you join again, and you can re-enter whenever you like.
              </p>
            ) : (
              <>
                <p>
                  Because this group is paid, your dashboard access ends as soon as you leave. If
                  your ERC-1155 membership pass is still active and you keep holding it, you can
                  rejoin without paying again.
                </p>
                <p>
                  Selling the pass or letting it expire means you will need to mint a fresh
                  membership before returning.
                </p>
                <div className='rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground'>
                  {isCheckingExpiry
                    ? 'Checking your pass expiration...'
                    : `Current pass expires ${expiryDisplay}.`}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant='ghost' onClick={() => setDialogOpen(false)} disabled={isLeaving}>
              Stay in group
            </Button>
            <Button variant='destructive' onClick={handleLeave} disabled={isLeaving}>
              {isLeaving ? 'Leaving...' : 'Confirm leave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
