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
import { cn } from '@/lib/utils'

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
            variant='secondary'
            className='mb-10 flex items-center gap-3 text-sm'
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
                variant='ghost'
                className='text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40'
                onClick={() => {
                  if (!address) return
                  removeModule({ moduleId: module._id, address })
                }}
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>

            <ul>
              {module.lessons.map(lesson => {
                const isSelected = selectedLesson?._id === lesson._id
                return (
                  <li
                    key={lesson._id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-md p-2 pl-4 transition duration-150 ease-in-out',
                      isSelected
                        ? 'bg-primary/10 ring-1 ring-primary/40'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => setSelectedLesson(lesson)}
                  >
                    <CaseSensitive
                      className={cn(
                        'h-4 w-4 shrink-0 transition-colors',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                    <p
                      className={cn(
                        'flex-1 text-sm font-medium capitalize transition-colors',
                        isSelected ? 'text-primary' : 'text-foreground'
                      )}
                    >
                      {lesson.title}
                    </p>
                    <Button
                      variant='ghost'
                      className='text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40'
                      onClick={event => {
                        event.stopPropagation()
                        if (!address) return
                        removeLesson({ lessonId: lesson._id, address })
                      }}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </li>
                )
              })}
            </ul>

            <Button
              variant='ghost'
              onClick={() => handleAddLesson(module._id)}
              className='mt-4 flex w-full items-center gap-2'
            >
              <Plus className='h-4 w-4' />
              <p>Add lesson</p>
            </Button>
          </div>
        ))}
        <Button
          variant='outline'
          onClick={() => handleAddModule(course._id)}
          className='mt-4 flex w-full items-center gap-2'
        >
          <Plus className='h-4 w-4' />
          <p>Add module</p>
        </Button>
      </div>
      <div className='flex-grow rounded-xl border border-border bg-card p-4 shadow-sm md:w-3/4'>
        {selectedLesson && <LessonEditorView lesson={selectedLesson} />}
      </div>
    </div>
  )
}
