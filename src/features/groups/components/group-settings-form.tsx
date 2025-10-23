'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'
import { z } from 'zod'

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
import type { Doc } from '@/convex/_generated/dataModel'

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
    thumbnailUrl: z
      .string()
      .trim()
      .url('Enter a valid image URL')
      .optional()
      .or(z.literal('')),
    galleryUrls: z.string().optional(),
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
    }
  })

type GroupSettingsFormProps = {
  group: Doc<'groups'>
}

type GroupSettingsValues = z.infer<typeof settingsSchema>

export function GroupSettingsForm({ group }: GroupSettingsFormProps) {
  const { address } = useAccount()
  const updateSettings = useMutation(api.groups.updateSettings)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<GroupSettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      shortDescription: group.shortDescription ?? '',
      aboutUrl: group.aboutUrl ?? '',
      thumbnailUrl: group.thumbnailUrl ?? '',
      galleryUrls: (group.galleryUrls ?? []).join('\n'),
      tags: (group.tags ?? []).join(', '),
      visibility: group.visibility ?? 'private',
      billingCadence: group.billingCadence ?? (group.price > 0 ? 'monthly' : 'free'),
      price: group.price ? String(group.price) : ''
    }
  })

  const onSubmit = async (values: GroupSettingsValues) => {
    if (!address) {
      toast.error('Connect your wallet to update settings.')
      return
    }

    try {
      setIsSaving(true)

      const priceRaw =
        values.billingCadence === 'monthly' && values.price
          ? Number(values.price)
          : 0

      const parsedPrice = Number.isFinite(priceRaw) ? Math.max(0, priceRaw) : 0

      const gallery = values.galleryUrls
        ?.split('\n')
        .map(url => url.trim())
        .filter(Boolean)

      const tags = values.tags
        ?.split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean)

      await updateSettings({
        id: group._id,
        ownerAddress: address,
        shortDescription: values.shortDescription?.trim(),
        aboutUrl: values.aboutUrl?.trim() || undefined,
        thumbnailUrl: values.thumbnailUrl?.trim() || undefined,
        galleryUrls: gallery,
        tags,
        visibility: values.visibility,
        billingCadence: parsedPrice > 0 ? 'monthly' : values.billingCadence,
        price: parsedPrice
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

        <FormField
          control={form.control}
          name='thumbnailUrl'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Thumbnail image URL</FormLabel>
              <FormControl>
                <Input placeholder='https://...' {...field} />
              </FormControl>
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
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gallery assets</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder='Add one URL per line to feature additional media.'
                  {...field}
                />
              </FormControl>
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
