'use client'

import { useState } from 'react'

import { useAccount } from 'wagmi'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { useApiMutation } from '@/hooks/use-api-mutation'

type GroupCommentInputProps = {
  postId: Id<'posts'>
}

export function GroupCommentInput({ postId }: GroupCommentInputProps) {
  const { address } = useAccount()
  const [value, setValue] = useState('')
  const { mutate, pending } = useApiMutation(api.comments.add)

  const canSubmit = Boolean(value.trim()) && Boolean(address) && !pending

  const submitComment = async () => {
    if (!canSubmit) return
    await mutate({ postId, content: value.trim(), address })
    setValue('')
  }

  return (
    <div className='flex w-full flex-col gap-2 sm:flex-row'>
      <Input
        placeholder='Share your perspective...'
        value={value}
        disabled={pending}
        onChange={event => setValue(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submitComment()
          }
        }}
      />
      <Button
        type='button'
        variant='secondary'
        disabled={!canSubmit}
        onClick={submitComment}
      >
        Add comment
      </Button>
    </div>
  )
}
