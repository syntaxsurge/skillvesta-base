'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useMutation, useQuery } from 'convex/react'
import {
  BookCheck,
  CaseSensitive,
  Component,
  Fullscreen,
  Plus,
  Trash2
} from 'lucide-react'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { LessonEditorView } from '@/features/classroom/components/course/lesson-editor-view'
import { ModuleNameEditor } from '@/features/classroom/components/course/module-name-editor'
import { useCurrentUser } from '@/hooks/use-current-user'

type CourseEditPageClientProps = {
  groupId: Id<'groups'>
  courseId: Id<'courses'>
}

export function CourseEditPageClient({
  groupId,
  courseId
}: CourseEditPageClientProps) {
  type CourseWithRelations = Doc<'courses'> & {
    modules: Array<Doc<'modules'> & { lessons: Doc<'lessons'>[] }>
  }

  const course = useQuery(api.courses.get, {
    id: courseId
  }) as CourseWithRelations | null | undefined
  const updateTitle = useMutation(api.courses.updateTitle)

  const { currentUser, address } = useCurrentUser()
  const group = useQuery(api.groups.get, { id: groupId })
  const router = useRouter()
  const [selectedLesson, setSelectedLesson] = useState<Doc<'lessons'>>()
  const addLesson = useMutation(api.lessons.add)
  const addModule = useMutation(api.modules.add)
  const removeLesson = useMutation(api.lessons.remove)
  const removeModule = useMutation(api.modules.remove)

  if (course === undefined) {
    return <LoadingIndicator fullScreen />
  }

  if (course === null) {
    return (
      <div className='flex h-full items-center justify-center text-sm text-muted-foreground'>
        Course not found.
      </div>
    )
  }

  const handleEditClick = () => {
    router.push(`/${groupId}/classroom/${course._id}`)
  }

  const handleTitleUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!address) return
    updateTitle({ title: e.target.value, id: course._id, address })
  }

  const handleAddLesson = (moduleId: Id<'modules'>) => {
    if (!address) return
    addLesson({ moduleId, address })
  }

  const handleAddModule = (courseIdValue: Id<'courses'>) => {
    if (!address) return
    addModule({ courseId: courseIdValue, address })
  }

  const isOwner = currentUser?._id === group?.ownerId

  if (!isOwner) return <div>Unauthorized</div>

  return (
    <div className='flex h-full w-full flex-col gap-4 p-4 md:flex-row'>
      <div className='w-full md:w-1/4'>
        {isOwner && (
          <Button
            onClick={handleEditClick}
            variant={'secondary'}
            className='mb-10 space-x-3 text-sm text-zinc-600'
          >
            <Fullscreen className='h-4 w-4' />
            <p>Preview</p>
          </Button>
        )}
        <div className='mb-6 flex items-center space-x-3'>
          <BookCheck />
          <Input
            value={course.title}
            onBlur={handleTitleUpdate}
            onChange={handleTitleUpdate}
          />
        </div>

        {course.modules.map(module => (
          <div key={module._id} className='mb-8'>
            <div className='mb-6 flex items-center space-x-3'>
              <Component />
              <ModuleNameEditor
                id={module._id}
                name={module.title}
                key={module._id}
                ownerAddress={address}
              />
              <Button
                variant={'secondary'}
                className='text-red-300'
                onClick={() => {
                  if (!address) return
                  removeModule({ moduleId: module._id, address })
                }}
              >
                <Trash2 />
              </Button>
            </div>

            <ul>
              {module.lessons.map(lesson => (
                <li
                  key={lesson._id}
                  className={`flex cursor-pointer items-center space-x-3 rounded-md p-2 pl-4 transition duration-150 ease-in-out ${
                    selectedLesson?._id === lesson._id
                      ? 'bg-blue-100 hover:bg-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <CaseSensitive className='text-zinc-500' />
                  <p className='capitalize'>{lesson.title}</p>
                  <Button
                    variant={'secondary'}
                    className='text-red-300'
                    onClick={() => {
                      if (!address) return
                      removeLesson({ lessonId: lesson._id, address })
                    }}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </li>
              ))}
            </ul>

            <Button
              variant={'ghost'}
              onClick={() => handleAddLesson(module._id)}
              className='mt-4 flex w-full space-x-2'
            >
              <Plus className='h-4 w-4' />
              <p>Add lesson</p>
            </Button>
          </div>
        ))}
        <Button
          variant={'outline'}
          onClick={() => handleAddModule(course._id)}
          className='mt-4 flex w-full space-x-2 border-2 p-0 text-blue-700'
        >
          <Plus className='h-4 w-4' />
          <p>Add module</p>
        </Button>
      </div>
      <div className='flex-grow rounded-xl bg-gray-50 p-4 shadow-md md:w-3/4'>
        {selectedLesson && <LessonEditorView lesson={selectedLesson} />}
      </div>
    </div>
  )
}
