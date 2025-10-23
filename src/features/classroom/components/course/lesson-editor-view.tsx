import { useEffect, useState } from 'react'

import { CaseSensitive, Text } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from 'wagmi'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import { Doc } from '@/convex/_generated/dataModel'
import { useApiMutation } from '@/hooks/use-api-mutation'

interface LessonEditorViewProps {
  lesson: Doc<'lessons'>
}

export const LessonEditorView = ({ lesson }: LessonEditorViewProps) => {
  const [title, setTitle] = useState(lesson.title)
  const [description, setDescription] = useState(lesson.description)
  const [videoUrl, setVideoUrl] = useState(lesson.youtubeUrl)
  const { mutate: update, pending } = useApiMutation(api.lessons.update)
  const { address } = useAccount()

  useEffect(() => {
    setTitle(lesson.title)
    setDescription(lesson.description)
    setVideoUrl(lesson.youtubeUrl)
  }, [lesson])

  console.log(title)
  const handleSave = () => {
    if (!address) return
    update({
      lessonId: lesson._id,
      title,
      description,
      youtubeUrl: videoUrl,
      address
    })
    toast.success('Lesson updated')
  }

  return (
    <div className='space-y-4 rounded-lg border border-neutral-300 p-4'>
      <div className='mb-6 flex items-center space-x-3'>
        <CaseSensitive className='text-zinc-500' />
        <Input
          placeholder='Title'
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <Input
        placeholder='YouTube Video URL'
        value={videoUrl}
        onChange={e => setVideoUrl(e.target.value)}
      />
      <div className='flex flex-col'>
        <p className='text-xs text-zinc-500'>
          Muse be embed link, not a normal link. Go to Share video &gt; Embed
          and copy the link from IFrame.
        </p>
        <p className='text-xs text-zinc-500'>
          Example: https://www.youtube.com/embed/TalBbvAhdIY?si=lFIwtjTGxE5AgZHe
        </p>
      </div>
      <AspectRatio ratio={16 / 9}>
        <iframe
          width='100%'
          height='100%'
          src={videoUrl}
          title='YouTube video player'
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        ></iframe>
      </AspectRatio>
      <div className='mb-6 mt-3 flex items-center space-x-3'>
        <Text className='mt-3 text-zinc-500' />
        <Input
          placeholder='Description'
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
      </div>
      <Button onClick={handleSave} disabled={pending}>
        Save
      </Button>
    </div>
  )
}
