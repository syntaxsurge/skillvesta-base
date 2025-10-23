'use client'

import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import { useCallback } from 'react'

import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { useMutation } from 'convex/react'
import { AlertOctagon } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'

import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'

type GroupPostContentEditorProps = {
  postId: Id<'posts'>
  initialContent?: string
  editable?: boolean
  className?: string
}

const MAX_SERIALIZED_LENGTH = 40_000

function parseInitialContent(initialContent?: string) {
  if (!initialContent) return undefined

  try {
    return JSON.parse(initialContent)
  } catch (error) {
    console.warn('Failed to parse stored post content', error)
    return undefined
  }
}

export function GroupPostContentEditor({
  postId,
  initialContent,
  editable = false,
  className
}: GroupPostContentEditorProps) {
  const updatePost = useMutation(api.posts.updateContent)
  const { address } = useAccount()

  const editor = useCreateBlockNote({
    initialContent: parseInitialContent(initialContent)
  })

  const handlePersist = useCallback(() => {
    if (!address) return
    if (!editor.document) return

    const serialized = JSON.stringify(editor.document, null, 2)

    if (serialized.length > MAX_SERIALIZED_LENGTH) {
      toast.error('Content is too long. Not saved.', {
        duration: 2000,
        icon: <AlertOctagon />
      })
      return
    }

    updatePost({
      id: postId,
      content: serialized,
      address
    }).catch(() => {
      toast.error('Unable to save changes, please retry.')
    })
  }, [address, editor.document, postId, updatePost])

  return (
    <BlockNoteView
      editor={editor}
      editable={editable}
      theme='light'
      onChange={handlePersist}
      className={className}
    />
  )
}
