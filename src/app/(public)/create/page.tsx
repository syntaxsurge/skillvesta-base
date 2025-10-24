'use client'

import { useCallback, useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from 'convex/react'
import { toast } from 'sonner'
import { erc20Abi, parseUnits } from 'viem'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/convex/_generated/api'
import {
  MEMBERSHIP_DURATION_SECONDS,
  MEMBERSHIP_TRANSFER_COOLDOWN_SECONDS,
  PLATFORM_TREASURY_ADDRESS,
  REGISTRAR_CONTRACT_ADDRESS,
  USDC_CONTRACT_ADDRESS
} from '@/lib/config'
import {
  SUBSCRIPTION_PRICE_AMOUNT,
  SUBSCRIPTION_PRICE_LABEL
} from '@/lib/pricing'
import { ACTIVE_CHAIN } from '@/lib/wagmi'
import { registrarAbi } from '@/lib/onchain/abi'
import { GroupMediaFields } from '@/features/groups/components/group-media-fields'
import { generateMembershipCourseId } from '@/features/groups/utils/membership'
import { isValidMediaReference, normalizeMediaInput } from '@/features/groups/utils/media'
import { useAppRouter } from '@/hooks/use-app-router'

const createGroupSchema = z
  .object({
    name: z.string().min(2, 'Group name is required').max(80),
    shortDescription: z
      .string()
      .min(20, 'Describe the group in at least 20 characters')
      .max(200, 'Keep the summary under 200 characters'),
    aboutUrl: z
      .string()
      .trim()
      .url('Enter a valid URL')
      .optional()
      .or(z.literal('')),
    thumbnailUrl: z.string().optional(),
    galleryUrls: z.array(z.string()).default([]),
    tags: z.string().optional(),
    visibility: z.enum(['public', 'private']).default('private'),
    billingCadence: z.enum(['free', 'monthly']).default('free'),
    price: z.string().optional()
  })
  .superRefine((data, ctx) => {
    if (data.billingCadence === 'monthly') {
      if (!data.price || data.price.trim() === '') {
        ctx.addIssue({
          path: ['price'],
          code: z.ZodIssueCode.custom,
          message: 'Monthly pricing is required'
        })
      } else if (Number.isNaN(Number(data.price))) {
        ctx.addIssue({
          path: ['price'],
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid number'
        })
      } else if (Number(data.price) <= 0) {
        ctx.addIssue({
          path: ['price'],
          code: z.ZodIssueCode.custom,
          message: 'Price must be greater than zero'
        })
      }

      if (data.visibility !== 'private') {
        ctx.addIssue({
          path: ['visibility'],
          code: z.ZodIssueCode.custom,
          message: 'Paid memberships must be private.'
        })
      }
    }

    if (!isValidMediaReference(data.thumbnailUrl)) {
      ctx.addIssue({
        path: ['thumbnailUrl'],
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid image URL or upload a file.'
      })
    }

    data.galleryUrls.forEach((value, index) => {
      if (!isValidMediaReference(value)) {
        ctx.addIssue({
          path: ['galleryUrls', index],
          code: z.ZodIssueCode.custom,
          message: 'Provide a valid image URL or upload a file.'
        })
      }
    })
  })

type CreateGroupFormValues = z.infer<typeof createGroupSchema>

const DEFAULT_VALUES: CreateGroupFormValues = {
  name: '',
  shortDescription: '',
  aboutUrl: '',
  thumbnailUrl: '',
  galleryUrls: [],
  tags: '',
  visibility: 'private',
  billingCadence: 'free',
  price: ''
}

export default function Create() {
  const router = useAppRouter()
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: ACTIVE_CHAIN.id })
  const createGroup = useMutation(api.groups.create)
  const generateUploadUrl = useMutation(api.media.generateUploadUrl)
  const requestUploadUrl = useCallback(() => generateUploadUrl({}), [generateUploadUrl])

  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: DEFAULT_VALUES
  })

  const billingCadence = form.watch('billingCadence')

  useEffect(() => {
    if (
      billingCadence === 'monthly' &&
      form.getValues('visibility') !== 'private'
    ) {
      form.setValue('visibility', 'private', {
        shouldDirty: true,
        shouldValidate: true
      })
    }
  }, [billingCadence, form])

  const isProcessing = form.formState.isSubmitting

  const handleSubmit = async (values: CreateGroupFormValues) => {
    let txHash: `0x${string}` | null = null

    if (!address) {
      toast.error('Connect your wallet to continue')
      return
    }

    const treasuryAddress = PLATFORM_TREASURY_ADDRESS as `0x${string}` | ''
    const usdcTokenAddress = USDC_CONTRACT_ADDRESS as `0x${string}`
    const registrarAddress = REGISTRAR_CONTRACT_ADDRESS as `0x${string}` | ''

    if (!treasuryAddress) {
      toast.error('Treasury address not configured')
      return
    }

    if (!registrarAddress) {
      toast.error('Registrar contract address not configured')
      return
    }

    if (!publicClient) {
      toast.error('Blockchain client unavailable. Please try again.')
      return
    }

    try {
      let courseIdStr: string | null = null
      const balance = (await publicClient.readContract({
        address: usdcTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address]
      })) as bigint

      if (balance < SUBSCRIPTION_PRICE_AMOUNT) {
        toast.error(
          `Insufficient USDC balance. You need ${SUBSCRIPTION_PRICE_LABEL}.`
        )
        return
      }

      const hash = await writeContractAsync({
        address: usdcTokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [treasuryAddress, SUBSCRIPTION_PRICE_AMOUNT]
      })

      txHash = hash
      await publicClient.waitForTransactionReceipt({ hash })

      const priceString =
        values.billingCadence === 'monthly' && values.price
          ? values.price.trim()
          : ''
      const formattedPrice =
        priceString !== '' ? Math.max(0, Number(priceString)) : 0
      const membershipPriceAmount =
        priceString !== '' ? parseUnits(priceString, 6) : 0n

      courseIdStr = generateMembershipCourseId()
      const courseId = BigInt(courseIdStr)

      const registerHash = await writeContractAsync({
        address: registrarAddress,
        abi: registrarAbi,
        functionName: 'registerCourse',
        args: [
          courseId,
          membershipPriceAmount,
          [address as `0x${string}`],
          [10000],
          BigInt(MEMBERSHIP_DURATION_SECONDS),
          BigInt(MEMBERSHIP_TRANSFER_COOLDOWN_SECONDS)
        ]
      })
      await publicClient.waitForTransactionReceipt({ hash: registerHash })

      const thumbnailSource = normalizeMediaInput(values.thumbnailUrl)

      const gallery = (values.galleryUrls ?? [])
        .map(entry => normalizeMediaInput(entry))
        .filter(Boolean)

      const tags = values.tags
        ?.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean)

      const resolvedVisibility =
        values.billingCadence === 'monthly' ? 'private' : values.visibility

      if (!courseIdStr) {
        throw new Error('Failed to generate membership course id.')
      }

      const groupId = await createGroup({
        ownerAddress: address,
        name: values.name.trim(),
        description: undefined,
        shortDescription: values.shortDescription.trim(),
        aboutUrl: normalizeMediaInput(values.aboutUrl) || undefined,
        thumbnailUrl: thumbnailSource || undefined,
        galleryUrls: gallery.length ? gallery : undefined,
        tags,
        visibility: resolvedVisibility,
        billingCadence:
          formattedPrice > 0 ? 'monthly' : values.billingCadence,
        price: formattedPrice,
        subscriptionId: courseIdStr
      } as any)

      toast.success('Your group is live!')
      router.push(`/${groupId}/about`)
    } catch (error: any) {
      console.error('Failed to complete group creation', error)
      const message =
        txHash !== null
          ? 'Group creation payment succeeded but the finalization failed. Please refresh — your group may appear shortly.'
          : 'Payment failed. Please try again.'
      toast.error(message)
    }
  }

  return (
    <div className='grid gap-10 lg:grid-cols-[minmax(0,480px)_minmax(0,520px)]'>
      <div className='space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm'>
        <Logo />
        <div className='space-y-2'>
          <h1 className='text-2xl font-semibold text-foreground'>
            Launch your community
          </h1>
          <p className='text-sm text-muted-foreground'>
            {SUBSCRIPTION_PRICE_LABEL}. Cancel anytime hassle-free. Access all features with unlimited usage and no hidden charges.
          </p>
        </div>

        <ul className='space-y-2 text-sm text-muted-foreground'>
          <li>🚀 Drive exceptional engagement</li>
          <li>💖 Set up seamlessly</li>
          <li>😄 Offer a delightful user experience</li>
          <li>💸 Monetize through Base-native membership fees</li>
          <li>📱 Accessible via iOS and Android apps</li>
          <li>🌍 Connect with members around the globe</li>
        </ul>
      </div>

      <div className='rounded-2xl border border-border bg-card p-8 shadow-sm'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
            <div className='space-y-4'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group name</FormLabel>
                    <FormControl>
                      <Input placeholder='Self Inquiry Support Group' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='shortDescription'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder='Share what members will experience.'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='grid gap-4 md:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='visibility'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={billingCadence === 'monthly'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Select visibility' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem
                            value='public'
                            disabled={billingCadence === 'monthly'}
                          >
                            Public
                          </SelectItem>
                          <SelectItem value='private'>Private</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Public groups let anyone browse your classroom and feed. Private groups gate content to members.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='billingCadence'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Membership</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={value => {
                          field.onChange(value)
                          if (value === 'free') {
                            form.setValue('price', '')
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder='Choose pricing' />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value='free'>Free for members</SelectItem>
                          <SelectItem value='monthly'>Paid subscription</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose whether members pay a monthly USDC subscription to join.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.watch('billingCadence') === 'monthly' && (
                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly price (USDC)</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min='0'
                          step='0.01'
                          placeholder='49'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Members will pay this amount in USDC when they join.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <GroupMediaFields
                form={form}
                requestUploadUrl={requestUploadUrl}
              />

              <FormField
                control={form.control}
                name='aboutUrl'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Intro video URL</FormLabel>
                    <FormControl>
                      <Input placeholder='https://youtube.com/watch?v=...' {...field} />
                    </FormControl>
                    <FormDescription>
                      Supports YouTube, Vimeo, or direct video links.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <FormField
                control={form.control}
                name='tags'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder='community, mindset, health' {...field} />
                    </FormControl>
                    <FormDescription>
                      Separate tags with commas to help members discover your group.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type='submit' disabled={isProcessing} className='w-full'>
              {isProcessing ? 'Processing...' : 'Create group'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
