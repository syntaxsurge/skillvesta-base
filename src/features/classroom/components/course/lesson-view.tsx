import { CaseSensitive, Text } from 'lucide-react'

import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Doc } from '@/convex/_generated/dataModel'

interface LessonViewProps {
  lesson: Doc<'lessons'>
}

export const LessonView = ({ lesson }: LessonViewProps) => {
  return (
    <div className='space-y-4 rounded-lg border border-neutral-300 p-4'>
      <div className='mb-6 flex items-center space-x-3'>
        <CaseSensitive className='text-zinc-500' />
        <h1 className='text-xl capitalize'>{lesson.title}</h1>
      </div>

      <AspectRatio ratio={16 / 9}>
        <iframe
          width='100%'
          height='100%'
          src={lesson.youtubeUrl}
          title='YouTube video player'
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        ></iframe>
      </AspectRatio>
      <div className='mb-6 mt-3 flex items-center space-x-3'>
        <Text className='mt-3 text-zinc-500' />
        <p className='text-md mt-3 font-normal'>{lesson.description}</p>
      </div>
    </div>
  )
}
