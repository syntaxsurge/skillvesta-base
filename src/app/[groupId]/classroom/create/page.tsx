'use client'

import { useState } from 'react'

import { useAccount } from 'wagmi'
import { useAppRouter } from '@/hooks/use-app-router'

import { Logo } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import { useApiMutation } from '@/hooks/use-api-mutation'
import { useGroupContext } from '@/features/groups/context/group-context'

interface CreateCourseProps {
  params: Promise<{
    groupId: string
  }>
}

const CreateCourse = (_props: CreateCourseProps) => {
  const router = useAppRouter()
  const { mutate: create, pending } = useApiMutation(api.courses.create)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const { address } = useAccount()
  const { group } = useGroupContext()

  const handleCreate = async () => {
    if (!address) return
    const groupId = group._id
    const courseId = await create({
      title,
      description,
      groupId,
      address
    })
    setTitle('')
    setDescription('')
    router.push(`/${groupId}/classroom/${courseId}`)
  }

  return (
    <div className='flex h-full items-center justify-center text-xl'>
      <div className='flex h-[450px] max-w-[550px] flex-col justify-between'>
        <Logo />
        <p className='font-bold'>
          🎓 Create and share your knowledge with the world through an engaging
          online course.
        </p>
        <p>🚀 Drive exceptional learning outcomes</p>
        <p>💖 Set up your course seamlessly</p>
        <p>😄 Enjoy a delightful learning experience</p>
        <p>💸 Monetize through course enrollment</p>
        <p>📱 Accessible via iOS and Android apps</p>
        <p>🌍 Connect with learners worldwide</p>
      </div>

      <div className='flex h-[450px] max-w-[550px] flex-col justify-between rounded-lg p-16 shadow-xl'>
        <h2 className='font-bold'>Create a course</h2>
        <p className='text-sm'>
          Create your course today and share your knowledge with the world.
        </p>

        <Input
          placeholder='Course name'
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Input
          placeholder='Course description'
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={pending}>
          Create
        </Button>
      </div>
    </div>
  )
}

export default CreateCourse
