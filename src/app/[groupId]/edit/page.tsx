'use client'

import { useEffect } from 'react'

import Image from 'next/image'
import { useAppRouter } from '@/hooks/use-app-router'

import { Button } from '@/components/ui/button'
import { GroupDescriptionEditor } from '@/features/groups/components/group-description-editor'
import { GroupNameEditor } from '@/features/groups/components/group-name-editor'
import { GroupSettingsForm } from '@/features/groups/components/group-settings-form'
import { formatGroupPriceLabel } from '@/features/groups/utils/price'
import { useGroupContext } from '@/features/groups/context/group-context'

type GroupEditPageProps = {
  params: Promise<{
    groupId: string
  }>
}

export default function GroupEditPage(_props: GroupEditPageProps) {
  const router = useAppRouter()
  const { group, isOwner, memberCount } = useGroupContext()

  useEffect(() => {
    if (!isOwner) {
      router.replace(`/${group._id}`)
    }
  }, [group._id, isOwner, router])

  if (!isOwner) {
    return null
  }

  const totalMembers =
    typeof memberCount === 'number'
      ? memberCount
      : group.memberNumber ?? 0
  const memberLabel = totalMembers === 1 ? 'member' : 'members'

  const priceLabel = formatGroupPriceLabel(
    group.price,
    group.billingCadence,
    { includeCadence: true }
  )

  return (
    <div className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]'>
      <div className='space-y-6'>
        <div className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
          <GroupNameEditor groupId={group._id} name={group.name} />
        </div>

        <div className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
          <GroupSettingsForm group={group} />
        </div>

        <div className='rounded-2xl border border-border bg-card p-6 shadow-sm'>
          <GroupDescriptionEditor
            editable
            groupId={group._id}
            initialContent={group.description}
          />
        </div>
      </div>

      <aside className='space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm'>
        <div>
          <h2 className='text-xl font-semibold text-foreground'>Preview</h2>
          <p className='text-sm text-muted-foreground'>
            {totalMembers} {memberLabel}
          </p>
        </div>

        {group.thumbnailUrl ? (
          <div className='relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border'>
            <Image
              src={group.thumbnailUrl}
              alt='Group thumbnail preview'
              fill
              className='object-cover'
              sizes='320px'
            />
          </div>
        ) : (
          <div className='flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted text-xs uppercase tracking-wide text-muted-foreground'>
            Thumbnail preview
          </div>
        )}

        <div className='space-y-2'>
          <p className='text-sm font-medium text-foreground'>{group.name}</p>
          <p className='text-xs text-muted-foreground'>
            {group.shortDescription ?? 'Add a tagline to introduce your community.'}
          </p>
        </div>

        <div className='rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground'>
          <p>
            <span className='font-medium text-foreground'>Visibility:</span>{' '}
            {group.visibility === 'public' ? 'Public' : 'Private'}
          </p>
          <p>
            <span className='font-medium text-foreground'>Membership:</span>{' '}
            {priceLabel}
          </p>
        </div>

        <Button
          type='button'
          className='w-full'
          onClick={() => router.push(`/${group._id}/about`)}
        >
          View live group
        </Button>
      </aside>
    </div>
  )
}
