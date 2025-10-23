'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { GroupDescriptionEditor } from '@/features/groups/components/group-description-editor'
import { GroupNameEditor } from '@/features/groups/components/group-name-editor'
import { useGroupContext } from '@/features/groups/context/group-context'

type GroupEditPageProps = {
  params: Promise<{
    groupId: string
  }>
}

export default function GroupEditPage(_props: GroupEditPageProps) {
  const router = useRouter()
  const { group, isOwner } = useGroupContext()

  useEffect(() => {
    if (!isOwner) {
      router.replace(`/${group._id}`)
    }
  }, [group._id, isOwner, router])

  if (!isOwner) {
    return null
  }

  const memberLabel = group.memberNumber === 1 ? 'member' : 'members'

  return (
    <div className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]'>
      <div className='space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm'>
        <GroupNameEditor groupId={group._id} name={group.name} />

        {group.aboutUrl && (
          <div className='aspect-video w-full overflow-hidden rounded-xl border border-border'>
            <iframe
              src={group.aboutUrl}
              title='Group introduction video'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen
              className='h-full w-full'
            />
          </div>
        )}

        <GroupDescriptionEditor
          editable
          groupId={group._id}
          initialContent={group.description}
        />
      </div>

      <aside className='space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm'>
        <div>
          <h2 className='text-xl font-semibold text-foreground'>Preview</h2>
          <p className='text-sm text-muted-foreground'>
            {group.memberNumber} {memberLabel}
          </p>
        </div>

        <p className='text-sm text-muted-foreground'>
          {group.shortDescription}
        </p>

        <Button
          type='button'
          className='w-full'
          onClick={() => router.push(`/${group._id}`)}
        >
          View live group
        </Button>
      </aside>
    </div>
  )
}
