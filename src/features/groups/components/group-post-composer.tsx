'use client'

import { useState } from 'react'

import { useAccount } from 'wagmi'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { useApiMutation } from '@/hooks/use-api-mutation'

type GroupPostComposerProps = {
  groupId: Id<'groups'>
}

export function GroupPostComposer({ groupId }: GroupPostComposerProps) {
  const { address } = useAccount()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const { mutate: createPost, pending } = useApiMutation(api.posts.create)

  const canSubmit = Boolean(title.trim()) && Boolean(address) && !pending

  const handleCreate = async () => {
    if (!canSubmit) return

    await createPost({
      title: title.trim(),
      content: content.trim(),
      groupId,
      address
    })

    setTitle('')
    setContent('')
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type='button'
          className='w-full rounded-xl border border-dashed border-border bg-card px-6 py-4 text-left text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary'
        >
          Share something with your group…
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a post</DialogTitle>
          <DialogDescription>
            Spark a conversation with your community members.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <Input
            placeholder='Post title'
            value={title}
            onChange={event => setTitle(event.target.value)}
            autoFocus
          />
          <Textarea
            placeholder='What would you like to share?'
            value={content}
            onChange={event => setContent(event.target.value)}
            rows={5}
          />
        </div>

        <div className='flex justify-end gap-3'>
          <DialogClose asChild>
            <Button type='button' variant='ghost'>
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type='button' onClick={handleCreate} disabled={!canSubmit}>
              Publish post
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
