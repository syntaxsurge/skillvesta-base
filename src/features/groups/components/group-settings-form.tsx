'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from 'convex/react'
import { useConvex } from 'convex/react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useFieldArray, useForm, type FieldError } from 'react-hook-form'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { z } from 'zod'

import { ImageIcon, Link2, Plus, Trash2, UploadCloud, X } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { isStorageReference, extractStorageId, toStorageSource } from '@/lib/media'
import { useGroupContext } from '../context/group-context'
import { MediaDropzone } from './media-dropzone'

const administratorSchema = z.object({
  walletAddress: z
    .string()
    .trim()
    .min(1, 'Wallet address is required')
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Enter a valid wallet address'),
  share: z
    .string()
    .trim()
    .min(1, 'Share is required')
    .refine(value => !Number.isNaN(Number(value)), 'Enter a valid percentage')
    .refine(value => Number(value) > 0, 'Share must be greater than 0')
    .refine(value => Number(value) <= 100, 'Share cannot exceed 100')
})

function normalizeMediaInput(value: string | undefined | null) {
  return value?.trim() ?? ''
}

function isValidMediaReference(value: string | undefined | null) {
  const trimmed = value?.trim()
  if (!trimmed) return true

  if (isStorageReference(trimmed)) {
    return extractStorageId(trimmed).length > 0
  }

  try {
    new URL(trimmed)
    return true
  } catch {
    return false
  }
}

const settingsSchema = z
  .object({
    shortDescription: z
      .string()
      .max(200, 'Keep the summary under 200 characters')
      .optional(),
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
    price: z.string().optional(),
    administrators: z.array(administratorSchema).optional()
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
    }
    const admins = data.administrators ?? []
    if (admins.length > 0) {
      const seen = new Set<string>()
      let totalShare = 0

      admins.forEach((admin, index) => {
        const normalizedWallet = admin.walletAddress.trim().toLowerCase()
        if (seen.has(normalizedWallet)) {
          ctx.addIssue({
            path: ['administrators', index, 'walletAddress'],
            code: z.ZodIssueCode.custom,
            message: 'Duplicate administrator'
          })
        } else {
          seen.add(normalizedWallet)
        }

        const shareValue = Number(admin.share)
        if (!Number.isNaN(shareValue)) {
          totalShare += shareValue
        }
      })

      if (totalShare > 100) {
        ctx.addIssue({
          path: ['administrators'],
          code: z.ZodIssueCode.custom,
          message: 'Total share cannot exceed 100%.'
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

    data.galleryUrls?.forEach((entry, index) => {
      if (!isValidMediaReference(entry)) {
        ctx.addIssue({
          path: ['galleryUrls', index],
          code: z.ZodIssueCode.custom,
          message: 'Provide a valid image URL or upload a file.'
        })
      }
    })
  })

type GroupSettingsFormProps = {
  group: Doc<'groups'>
}

type GroupSettingsValues = z.infer<typeof settingsSchema>

function generateGalleryId(seed?: string) {
  if (seed) return seed
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `gallery-${Math.random().toString(36).slice(2, 10)}`
}

const MAX_GALLERY_ITEMS = 10

type GalleryItem = {
  id: string
  url: string
  source: string
  storageId?: string
}

export function GroupSettingsForm({ group }: GroupSettingsFormProps) {
  const { address } = useAccount()
  const convex = useConvex()
  const { owner, administrators: existingAdministrators, media } = useGroupContext()
  const updateSettings = useMutation(api.groups.updateSettings)
  const generateUploadUrl = useMutation(api.media.generateUploadUrl)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)
  const [isUploadingGallery, setIsUploadingGallery] = useState(false)
  const ownerAddress = owner?.walletAddress?.toLowerCase() ?? null

  const initialThumbnailSource = normalizeMediaInput(
    media.thumbnail?.source ?? group.thumbnailUrl ?? ''
  )
  const initialGallerySources = media.gallery.map(item => item.source)

  const form = useForm<GroupSettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      shortDescription: group.shortDescription ?? '',
      aboutUrl: group.aboutUrl ?? '',
      thumbnailUrl: initialThumbnailSource,
      galleryUrls: initialGallerySources,
      tags: (group.tags ?? []).join(', '),
      visibility: group.visibility ?? 'private',
      billingCadence: group.billingCadence ?? (group.price > 0 ? 'monthly' : 'free'),
      price: group.price ? String(group.price) : '',
      administrators: existingAdministrators.map(admin => ({
        walletAddress: admin.user.walletAddress,
        share: (admin.shareBps / 100).toString()
      }))
    }
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'administrators'
  })

  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    media.thumbnail?.url ?? (initialThumbnailSource ? initialThumbnailSource : null)
  )
  const [thumbnailTab, setThumbnailTab] = useState<'upload' | 'link'>(
    isStorageReference(initialThumbnailSource) ? 'upload' : 'link'
  )
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(
    media.gallery.map(entry => ({
      id: generateGalleryId(entry.storageId ?? entry.source),
      url: entry.url,
      source: entry.source,
      storageId: entry.storageId
    }))
  )
  const [galleryTab, setGalleryTab] = useState<'upload' | 'links'>(
    galleryItems.some(item => isStorageReference(item.source)) ? 'upload' : 'links'
  )
  const [galleryLinkInput, setGalleryLinkInput] = useState('')
  const thumbnailObjectUrlRef = useRef<string | null>(null)
  const galleryObjectUrlsRef = useRef<string[]>([])

  useEffect(() => {
    if (thumbnailObjectUrlRef.current) {
      URL.revokeObjectURL(thumbnailObjectUrlRef.current)
      thumbnailObjectUrlRef.current = null
    }

    if (galleryObjectUrlsRef.current.length) {
      galleryObjectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
      galleryObjectUrlsRef.current = []
    }

    const nextThumbnailSource = normalizeMediaInput(
      media.thumbnail?.source ?? group.thumbnailUrl ?? ''
    )
    form.setValue('thumbnailUrl', nextThumbnailSource, { shouldDirty: false })
    setThumbnailPreview(
      media.thumbnail?.url ?? (nextThumbnailSource ? nextThumbnailSource : null)
    )
    setThumbnailTab(
      nextThumbnailSource && isStorageReference(nextThumbnailSource)
        ? 'upload'
        : 'link'
    )

    const nextGalleryItems = media.gallery.map(entry => ({
      id: generateGalleryId(entry.storageId ?? entry.source),
      url: entry.url,
      source: entry.source,
      storageId: entry.storageId
    }))

    setGalleryItems(nextGalleryItems)
    form.setValue(
      'galleryUrls',
      nextGalleryItems.map(item => item.source),
      { shouldDirty: false }
    )
    setGalleryTab(
      nextGalleryItems.some(item => isStorageReference(item.source))
        ? 'upload'
        : 'links'
    )
  }, [
    form,
    group.thumbnailUrl,
    media.gallery,
    media.thumbnail?.source,
    media.thumbnail?.url
  ])

  useEffect(() => {
    return () => {
      if (thumbnailObjectUrlRef.current) {
        URL.revokeObjectURL(thumbnailObjectUrlRef.current)
      }
      galleryObjectUrlsRef.current.forEach(url => URL.revokeObjectURL(url))
    }
  }, [])

  const handleThumbnailFiles = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        toast.error('Please choose an image file.')
        return
      }

      try {
        setIsUploadingThumbnail(true)
        const { uploadUrl } = await generateUploadUrl({})
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }

        const payload = (await response.json()) as { storageId?: string }
        if (!payload.storageId) {
          throw new Error('Missing storage id')
        }

        const storageId = payload.storageId
        const { url } = await convex.query(api.media.getUrl, {
          storageId: storageId as Id<'_storage'>
        })

        if (thumbnailObjectUrlRef.current) {
          URL.revokeObjectURL(thumbnailObjectUrlRef.current)
          thumbnailObjectUrlRef.current = null
        }

        let resolvedUrl = url ?? null
        if (!resolvedUrl) {
          resolvedUrl = URL.createObjectURL(file)
          thumbnailObjectUrlRef.current = resolvedUrl
        }

        const source = toStorageSource(storageId)
        form.setValue('thumbnailUrl', source, {
          shouldDirty: true,
          shouldValidate: true
        })
        setThumbnailPreview(resolvedUrl)
        setThumbnailTab('upload')
        toast.success('Thumbnail ready to use.')
      } catch (error) {
        console.error('Thumbnail upload failed', error)
        toast.error('Unable to upload thumbnail. Please try a different image.')
      } finally {
        setIsUploadingThumbnail(false)
      }
    },
    [convex, form, generateUploadUrl]
  )

  const handleClearThumbnail = useCallback(() => {
    if (thumbnailObjectUrlRef.current) {
      URL.revokeObjectURL(thumbnailObjectUrlRef.current)
      thumbnailObjectUrlRef.current = null
    }
    setThumbnailPreview(null)
    form.setValue('thumbnailUrl', '', {
      shouldDirty: true,
      shouldValidate: true
    })
  }, [form])

  const handleAddGalleryLink = useCallback(() => {
    const trimmed = normalizeMediaInput(galleryLinkInput)
    if (!trimmed) {
      toast.error('Enter a URL before adding it to the gallery.')
      return
    }

    if (!isValidMediaReference(trimmed)) {
      toast.error('Enter a valid image URL.')
      return
    }

    if (galleryItems.length >= MAX_GALLERY_ITEMS) {
      toast.error(`You can add up to ${MAX_GALLERY_ITEMS} gallery assets.`)
      return
    }

    setGalleryItems(prev => {
      if (prev.some(item => item.source === trimmed)) {
        toast.error('This asset is already in your gallery.')
        return prev
      }
      const next = [
        ...prev,
        {
          id: generateGalleryId(trimmed),
          url: trimmed,
          source: trimmed
        }
      ]
      form.setValue(
        'galleryUrls',
        next.map(item => item.source),
        { shouldDirty: true, shouldValidate: true }
      )
      return next
    })
    setGalleryLinkInput('')
    setGalleryTab('links')
  }, [form, galleryItems.length, galleryLinkInput])

  const handleRemoveGalleryItem = useCallback(
    (id: string) => {
      setGalleryItems(prev => {
        const target = prev.find(item => item.id === id)
        if (target) {
          const index = galleryObjectUrlsRef.current.indexOf(target.url)
          if (index >= 0) {
            URL.revokeObjectURL(galleryObjectUrlsRef.current[index])
            galleryObjectUrlsRef.current.splice(index, 1)
          }
        }

        const next = prev.filter(item => item.id !== id)
        form.setValue(
          'galleryUrls',
          next.map(item => item.source),
          { shouldDirty: true, shouldValidate: true }
        )
        return next
      })
    },
    [form]
  )

  const handleGalleryFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return

      const remainingSlots = MAX_GALLERY_ITEMS - galleryItems.length
      if (remainingSlots <= 0) {
        toast.error(`You can add up to ${MAX_GALLERY_ITEMS} gallery assets.`)
        return
      }

      const toUpload = files.slice(0, remainingSlots)
      const uploaded: GalleryItem[] = []

      try {
        setIsUploadingGallery(true)
        for (const file of toUpload) {
          if (!file.type.startsWith('image/')) {
            toast.error(`${file.name} is not an image file.`)
            continue
          }

          const { uploadUrl } = await generateUploadUrl({})
          const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file
          })

          if (!response.ok) {
            toast.error(`Failed to upload ${file.name}.`)
            continue
          }

          const payload = (await response.json()) as { storageId?: string }
          if (!payload.storageId) {
            toast.error(`Upload failed for ${file.name}.`)
            continue
          }

          const storageId = payload.storageId
          const { url } = await convex.query(api.media.getUrl, {
            storageId: storageId as Id<'_storage'>
          })

          let resolvedUrl = url ?? null
          if (!resolvedUrl) {
            resolvedUrl = URL.createObjectURL(file)
            galleryObjectUrlsRef.current.push(resolvedUrl)
          }

          uploaded.push({
            id: generateGalleryId(storageId),
            url: resolvedUrl,
            source: toStorageSource(storageId),
            storageId
          })
        }
      } catch (error) {
        console.error('Gallery upload failed', error)
        toast.error('Unable to upload gallery assets right now.')
      } finally {
        setIsUploadingGallery(false)
      }

      if (!uploaded.length) {
        return
      }

      setGalleryItems(prev => {
        const next = [...prev, ...uploaded]
        form.setValue(
          'galleryUrls',
          next.map(item => item.source),
          { shouldDirty: true, shouldValidate: true }
        )
        return next
      })
      setGalleryTab('upload')
      toast.success('Gallery assets added.')
    },
    [convex, form, galleryItems.length, generateUploadUrl]
  )

  const administratorsValues = form.watch('administrators') ?? []
  const totalAdminShare = administratorsValues.reduce((total, admin) => {
    const share = Number(admin?.share)
    if (!Number.isFinite(share) || share < 0) {
      return total
    }
    return total + share
  }, 0)
  const ownerShare = Math.max(0, Number((100 - totalAdminShare).toFixed(2)))
  const galleryFieldErrors = form.formState.errors.galleryUrls
  const galleryErrorMessage = Array.isArray(galleryFieldErrors)
    ? galleryFieldErrors.find(
        (error): error is FieldError => Boolean(error?.message)
      )?.message
    : galleryFieldErrors?.message
  const remainingGallerySlots = MAX_GALLERY_ITEMS - galleryItems.length

  const onSubmit = async (values: GroupSettingsValues) => {
    if (!address) {
      toast.error('Connect your wallet to update settings.')
      return
    }

    try {
      setIsSaving(true)

      if (ownerAddress) {
        let ownerConflict = false
        values.administrators?.forEach((admin, index) => {
          const normalized = admin.walletAddress.trim().toLowerCase()
          if (normalized === ownerAddress) {
            form.setError(
              `administrators.${index}.walletAddress` as const,
              {
                type: 'manual',
                message:
                  'The group owner receives the remaining share automatically. Remove this wallet to continue.'
              }
            )
            ownerConflict = true
          }
        })
        if (ownerConflict) {
          setIsSaving(false)
          return
        }
      }

      const priceRaw =
        values.billingCadence === 'monthly' && values.price
          ? Number(values.price)
          : 0

      const parsedPrice = Number.isFinite(priceRaw) ? Math.max(0, priceRaw) : 0

      const thumbnailSource = normalizeMediaInput(values.thumbnailUrl)

      const gallery = (values.galleryUrls ?? [])
        .map(url => normalizeMediaInput(url))
        .filter(Boolean)

      const tags = values.tags
        ?.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean)

      const administratorPayload = (
        values.administrators?.map(admin => {
          const wallet = admin.walletAddress.trim()
          const shareNumeric = Number(admin.share)
          if (
            !wallet ||
            Number.isNaN(shareNumeric) ||
            shareNumeric <= 0
          ) {
            return null
          }
          return {
            walletAddress: wallet,
            shareBps: Math.round(shareNumeric * 100)
          }
        }) ?? []
      ).filter(
        (
          admin
        ): admin is { walletAddress: string; shareBps: number } => admin !== null
      )

      if (administratorPayload.length > 0) {
        const totalBps = administratorPayload.reduce(
          (total, admin) => total + admin.shareBps,
          0
        )
        if (totalBps > 10000) {
          const diff = totalBps - 10000
          const last = administratorPayload[administratorPayload.length - 1]
          last.shareBps = Math.max(0, last.shareBps - diff)
        }
      }

      const normalizedAdministrators = administratorPayload.filter(
        admin => admin.shareBps > 0
      )

      await updateSettings({
        id: group._id,
        ownerAddress: address,
        shortDescription: values.shortDescription?.trim(),
        aboutUrl: values.aboutUrl?.trim() || undefined,
        thumbnailUrl: thumbnailSource || undefined,
        galleryUrls: gallery,
        tags,
        visibility: values.visibility,
        billingCadence: parsedPrice > 0 ? 'monthly' : values.billingCadence,
        price: parsedPrice,
        administrators: normalizedAdministrators
      })

      toast.success('Group settings updated')
    } catch (error) {
      console.error('Failed to update group settings', error)
      toast.error('Unable to save settings. Please retry.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='shortDescription'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tagline</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder='Summarize your community in a sentence or two.'
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
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Choose visibility' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='public'>Public</SelectItem>
                    <SelectItem value='private'>Private</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Public groups let anyone explore your content before joining.
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
                <FormLabel>Membership pricing</FormLabel>
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
                      <SelectValue placeholder='Select pricing style' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='free'>Free for members</SelectItem>
                    <SelectItem value='monthly'>Paid subscription</SelectItem>
                  </SelectContent>
                </Select>
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
                  Members will pay this amount when they join.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className='space-y-2'>
          <label className='text-sm font-medium text-foreground'>Membership course ID</label>
          <Input value={group.subscriptionId ?? '—'} readOnly />
          <p className='text-xs text-muted-foreground'>
            Auto-generated when the group was created. Reference this value to locate the matching ERC-1155 pass.
          </p>
        </div>

        <div className='space-y-3 rounded-xl border border-border p-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <h3 className='text-sm font-semibold text-foreground'>
                Revenue administrators
              </h3>
              <p className='text-xs text-muted-foreground'>
                Add collaborators who should receive a share of each paid membership. The owner automatically keeps the remaining{' '}
                <span className='font-medium text-foreground'>
                  {ownerShare.toFixed(2)}%
                </span>
                .
              </p>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => append({ walletAddress: '', share: '' })}
            >
              <Plus className='mr-2 h-4 w-4' />
              Add collaborator
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className='rounded-md bg-muted/40 p-3 text-xs text-muted-foreground'>
              No additional revenue collaborators configured.
            </p>
          ) : (
            <div className='space-y-3'>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className='grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-start'
                >
                  <FormField
                    control={form.control}
                    name={`administrators.${index}.walletAddress`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wallet address</FormLabel>
                        <FormControl>
                          <Input placeholder='0x...' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`administrators.${index}.share`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Share (%)</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min='0'
                            max='100'
                            step='0.01'
                            placeholder='10'
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className='flex items-start justify-end pt-6'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => remove(index)}
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className='rounded-md bg-muted/40 p-3 text-xs text-muted-foreground'>
            Owner share updates automatically. Current owner share:{' '}
            <span className='font-medium text-foreground'>
              {ownerShare.toFixed(2)}%
            </span>
          </div>
        </div>

        <FormField
          control={form.control}
          name='thumbnailUrl'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail image</FormLabel>
              <Tabs
                value={thumbnailTab}
                onValueChange={value => setThumbnailTab(value as 'upload' | 'link')}
                className='space-y-3'
              >
                <TabsList className='grid w-full grid-cols-2'>
                  <TabsTrigger value='upload' className='flex items-center gap-2'>
                    <UploadCloud className='h-4 w-4' />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value='link' className='flex items-center gap-2'>
                    <Link2 className='h-4 w-4' />
                    Link
                  </TabsTrigger>
                </TabsList>
                <TabsContent value='upload'>
                  <MediaDropzone
                    accept='image/*'
                    uploading={isUploadingThumbnail}
                    disabled={isUploadingThumbnail}
                    dropAreaClassName='h-40 w-full overflow-hidden p-0 sm:h-48'
                    onSelect={handleThumbnailFiles}
                  >
                    {thumbnailPreview ? (
                      <div className='relative h-full w-full'>
                        <Image
                          src={thumbnailPreview}
                          alt='Group thumbnail preview'
                          fill
                          className='object-cover'
                          sizes='360px'
                        />
                      </div>
                    ) : (
                      <div className='flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground'>
                        <ImageIcon className='h-6 w-6' />
                        <span>Drag & drop an image to represent your group.</span>
                        <span className='text-xs text-muted-foreground'>
                          PNG, JPG, and GIF files are supported.
                        </span>
                      </div>
                    )}
                  </MediaDropzone>
                  {thumbnailPreview && (
                    <div className='mt-2 flex justify-end'>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        onClick={handleClearThumbnail}
                        disabled={isUploadingThumbnail}
                      >
                        <X className='mr-2 h-4 w-4' />
                        Remove
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value='link'>
                  <FormControl>
                    <Input
                      ref={field.ref}
                      name={field.name}
                      placeholder='https://example.com/thumbnail.jpg'
                      value={isStorageReference(field.value) ? '' : field.value ?? ''}
                      onBlur={field.onBlur}
                      onChange={event => {
                        const nextValue = event.target.value
                        field.onChange(nextValue)
                        const normalized = normalizeMediaInput(nextValue)
                        setThumbnailPreview(normalized || null)
                      }}
                    />
                  </FormControl>
                  <p className='mt-2 text-xs text-muted-foreground'>
                    Paste a direct image URL. JPG, PNG, or GIF files work best.
                  </p>
                </TabsContent>
              </Tabs>
              <FormMessage />
            </FormItem>
          )}
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
                Paste a YouTube, Vimeo, or direct video link to showcase the community.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='galleryUrls'
          render={() => (
            <FormItem>
              <FormLabel className='flex items-center justify-between text-sm font-medium'>
                Gallery assets
                <span className='text-xs font-normal text-muted-foreground'>
                  {galleryItems.length}/{MAX_GALLERY_ITEMS}
                </span>
              </FormLabel>
              <Tabs
                value={galleryTab}
                onValueChange={value => setGalleryTab(value as 'upload' | 'links')}
                className='space-y-3'
              >
                <TabsList className='grid w-full grid-cols-2'>
                  <TabsTrigger value='upload' className='flex items-center gap-2'>
                    <UploadCloud className='h-4 w-4' />
                    Upload
                  </TabsTrigger>
                  <TabsTrigger value='links' className='flex items-center gap-2'>
                    <Link2 className='h-4 w-4' />
                    Links
                  </TabsTrigger>
                </TabsList>
                <TabsContent value='upload'>
                  <MediaDropzone
                    accept='image/*'
                    multiple
                    uploading={isUploadingGallery}
                    disabled={isUploadingGallery || remainingGallerySlots <= 0}
                    onSelect={handleGalleryFiles}
                  >
                    <div className='flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground'>
                      <UploadCloud className='h-6 w-6' />
                      <span>
                        {remainingGallerySlots > 0
                          ? `Drag & drop up to ${remainingGallerySlots} more image${remainingGallerySlots === 1 ? '' : 's'}, or click to browse.`
                          : 'Gallery is full. Remove an asset to add another.'}
                      </span>
                      <span className='text-xs text-muted-foreground'>
                        PNG, JPG, and GIF files are supported.
                      </span>
                    </div>
                  </MediaDropzone>
                </TabsContent>
                <TabsContent value='links'>
                  <div className='space-y-3'>
                    <div className='flex flex-col gap-2 sm:flex-row'>
                      <Input
                        placeholder='https://example.com/gallery-image.png'
                        value={galleryLinkInput}
                        onChange={event => setGalleryLinkInput(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleAddGalleryLink()
                          }
                        }}
                      />
                      <Button
                        type='button'
                        onClick={handleAddGalleryLink}
                        disabled={!galleryLinkInput.trim()}
                      >
                        Add link
                      </Button>
                    </div>
                    <p className='text-xs text-muted-foreground'>
                      Paste direct image URLs to feature additional media.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {galleryItems.length > 0 ? (
                <div className='mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                  {galleryItems.map(item => (
                    <div
                      key={item.id}
                      className='group relative overflow-hidden rounded-lg border border-border'
                    >
                      <div className='relative aspect-[4/3] w-full bg-muted'>
                        <Image
                          src={item.url}
                          alt='Gallery asset preview'
                          fill
                          className='object-cover'
                          sizes='250px'
                        />
                      </div>
                      <div className='absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/60 via-black/40 to-transparent p-2 opacity-0 transition group-hover:opacity-100'>
                        <Button
                          type='button'
                          variant='secondary'
                          size='sm'
                          onClick={() => handleRemoveGalleryItem(item.id)}
                        >
                          <Trash2 className='mr-1.5 h-3.5 w-3.5' />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground'>
                  No gallery assets yet. Upload files or paste links to showcase more visuals.
                </div>
              )}

              {galleryErrorMessage && (
                <p className='mt-2 text-sm text-destructive'>{galleryErrorMessage}</p>
              )}
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
                <Input placeholder='community, tech, wellness' {...field} />
              </FormControl>
              <FormDescription>
                Separate tags with commas so members can find the group easily.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex justify-end'>
          <Button type='submit' disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
