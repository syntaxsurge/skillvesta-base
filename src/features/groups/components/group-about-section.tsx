'use client'

import { useMemo } from 'react'

import { GroupDescriptionEditor } from './group-description-editor'
import { GroupSidebar } from './group-sidebar'
import { useGroupContext } from '../context/group-context'

export function GroupAboutSection() {
  const { group, isOwner } = useGroupContext()

  const videoUrl = useMemo(() => {
    if (!group.aboutUrl) return null

    try {
      return new URL(group.aboutUrl).toString()
    } catch (error) {
      console.warn('Invalid aboutUrl configured for group', error)
      return null
    }
  }, [group.aboutUrl])

  return (
    <div className='grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]'>
      <div className='space-y-6 rounded-2xl border border-border bg-card p-6'>
        <div className='space-y-2'>
          <h1 className='text-2xl font-semibold text-foreground'>
            {group.name}
          </h1>
          <p className='text-sm text-muted-foreground'>
            {group.shortDescription}
          </p>
        </div>

        {videoUrl && (
          <div className='aspect-video w-full overflow-hidden rounded-xl border border-border'>
            <iframe
              src={videoUrl}
              title='Group introduction video'
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
              allowFullScreen
              className='h-full w-full'
            />
          </div>
        )}

        <GroupDescriptionEditor
          editable={isOwner}
          groupId={group._id}
          initialContent={group.description}
        />
      </div>

      <GroupSidebar />
    </div>
  )
}
