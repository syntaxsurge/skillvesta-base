'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { useMutation, useQuery } from 'convex/react'
import {
  BookCheck,
  CaseSensitive,
  Component,
  Fullscreen,
  ImageIcon,
  Link2,
  Plus,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react'
import { toast } from 'sonner'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { api } from '@/convex/_generated/api'
import type { Doc, Id } from '@/convex/_generated/dataModel'
import { LessonEditorView } from '@/features/classroom/components/course/lesson-editor-view'
import { ModuleNameEditor } from '@/features/classroom/components/course/module-name-editor'
import { MediaDropzone } from '@/features/groups/components/media-dropzone'
import { useApiMutation } from '@/hooks/use-api-mutation'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useResolvedMediaUrl } from '@/hooks/use-resolved-media-url'
import { isStorageReference, toStorageSource } from '@/lib/media'
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
  const generateUploadUrl = useMutation(api.media.generateUploadUrl)
  const { mutate: updateDescription, pending: descriptionPending } =
    useApiMutation(api.courses.updateDescription)
  const { mutate: updateThumbnail, pending: thumbnailPending } =
    useApiMutation(api.courses.updateThumbnail)

  const { currentUser, address } = useCurrentUser()
  const group = useQuery(api.groups.get, { id: groupId })
  const router = useRouter()
  const [selectedLesson, setSelectedLesson] = useState<Doc<'lessons'> | null>(
    null
  )
  const [courseDescription, setCourseDescription] = useState('')
  const [thumbnailSource, setThumbnailSource] = useState<string>('')
  const [thumbnailLinkInput, setThumbnailLinkInput] = useState('')
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)
  const [thumbnailTab, setThumbnailTab] = useState<'upload' | 'link'>('upload')
  const addLesson = useMutation(api.lessons.add)
  const addModule = useMutation(api.modules.add)
  const removeLesson = useMutation(api.lessons.remove)
  const removeModule = useMutation(api.modules.remove)
  const { url: thumbnailPreviewUrl, loading: thumbnailPreviewLoading } =
    useResolvedMediaUrl(thumbnailSource || course?.thumbnailUrl)

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

  const courseThumbnailValue = course.thumbnailUrl ?? ''

  useEffect(() => {
    setCourseDescription(course.description ?? '')
    setThumbnailSource(courseThumbnailValue)
    setThumbnailLinkInput(
      courseThumbnailValue && !isStorageReference(courseThumbnailValue)
        ? courseThumbnailValue
        : ''
    )
    setThumbnailTab(
      courseThumbnailValue && !isStorageReference(courseThumbnailValue)
        ? 'link'
        : 'upload'
    )
  }, [course._id, course.description, courseThumbnailValue])

  useEffect(() => {
    if (!course) return
    const lessonStillExists = selectedLesson
      ? course.modules.some(module =>
          module.lessons.some(lesson => lesson._id === selectedLesson._id)
        )
      : false

    if (selectedLesson && !lessonStillExists) {
      setSelectedLesson(null)
    }
  }, [course, selectedLesson])

  useEffect(() => {
    if (selectedLesson) return
    const firstPopulatedModule = course.modules.find(
      module => module.lessons.length > 0
    )
    if (firstPopulatedModule) {
      setSelectedLesson(firstPopulatedModule.lessons[0])
    }
  }, [course.modules, selectedLesson])

  const handleEditClick = () => {
    router.push(`/${groupId}/classroom/${course._id}`)
  }

  const handleTitleUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!address) return
    updateTitle({ title: e.target.value, id: course._id, address })
  }

  const applyThumbnailSource = (next: string | null) => {
    const resolved = next ?? ''
    const isLinkSource = Boolean(resolved) && !isStorageReference(resolved)
    setThumbnailSource(resolved)
    setThumbnailLinkInput(isLinkSource ? resolved : '')
    setThumbnailTab(isLinkSource ? 'link' : 'upload')
  }

  const handleDescriptionBlur = async () => {
    if (!address || descriptionPending) return
    const trimmed = courseDescription.trim()
    if (trimmed === course.description.trim()) {
      setCourseDescription(course.description)
      return
    }

    try {
      await updateDescription({
        id: course._id,
        description: trimmed,
        address
      })
      setCourseDescription(trimmed)
      toast.success('Course description updated.')
    } catch (error) {
      console.error('Failed to update course description', error)
      setCourseDescription(course.description)
      toast.error('Unable to update the course description right now.')
    }
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

  const handleThumbnailFiles = async (files: File[]) => {
    const file = files[0]
    if (!file || !address || thumbnailPending || isUploadingThumbnail) {
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }

    const previousSource = thumbnailSource
    try {
      setIsUploadingThumbnail(true)
      const { uploadUrl } = await generateUploadUrl({})
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const payload = (await response.json()) as { storageId?: string }
      if (!payload.storageId) {
        throw new Error('Missing storage id')
      }

      const source = toStorageSource(payload.storageId)
      await updateThumbnail({
        id: course._id,
        thumbnailUrl: source,
        address
      })
      applyThumbnailSource(source)
      toast.success('Course thumbnail updated.')
    } catch (error) {
      console.error('Uploading course thumbnail failed', error)
      applyThumbnailSource(previousSource)
      toast.error('Unable to upload that image. Try again with a different file.')
    } finally {
      setIsUploadingThumbnail(false)
    }
  }

  const handleThumbnailLinkCommit = async () => {
    if (!address || thumbnailPending) return
    const trimmed = thumbnailLinkInput.trim()
    const previousSource = thumbnailSource

    if (!trimmed) {
      if (!previousSource) return
      try {
        await updateThumbnail({
          id: course._id,
          thumbnailUrl: undefined,
          address
        })
        applyThumbnailSource('')
        toast.success('Course thumbnail removed.')
      } catch (error) {
        console.error('Removing course thumbnail failed', error)
        applyThumbnailSource(previousSource)
        toast.error('Unable to remove the course thumbnail.')
      }
      return
    }

    try {
      const candidate = new URL(trimmed)
      if (!['http:', 'https:'].includes(candidate.protocol)) {
        throw new Error('Unsupported protocol')
      }
    } catch {
      toast.error('Enter a valid image URL that starts with http:// or https://.')
      return
    }

    if (trimmed === previousSource) {
      return
    }

    try {
      await updateThumbnail({
        id: course._id,
        thumbnailUrl: trimmed,
        address
      })
      applyThumbnailSource(trimmed)
      toast.success('Course thumbnail updated.')
    } catch (error) {
      console.error('Saving thumbnail URL failed', error)
      applyThumbnailSource(previousSource)
      toast.error('Unable to update the course thumbnail.')
    }
  }

  const canRemoveThumbnail = useMemo(
    () => Boolean(thumbnailSource || thumbnailLinkInput.trim()),
    [thumbnailSource, thumbnailLinkInput]
  )

  const handleClearThumbnail = async () => {
    if (!thumbnailSource) {
      setThumbnailLinkInput('')
      applyThumbnailSource('')
      return
    }

    if (!address || thumbnailPending || isUploadingThumbnail) {
      return
    }

    const previousSource = thumbnailSource
    try {
      await updateThumbnail({
        id: course._id,
        thumbnailUrl: undefined,
        address
      })
      applyThumbnailSource('')
      setThumbnailLinkInput('')
      toast.success('Course thumbnail removed.')
    } catch (error) {
      console.error('Clearing thumbnail failed', error)
      applyThumbnailSource(previousSource)
      toast.error('Unable to remove the course thumbnail.')
    }
  }

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
            <div className='mb-6 flex items-center gap-3 rounded-md px-3 py-2'>
              <Component className='h-5 w-5 shrink-0 text-muted-foreground' />
              <div className='flex flex-1 items-center justify-center'>
                <ModuleNameEditor
                  id={module._id}
                  name={module.title}
                  key={module._id}
                  ownerAddress={address}
                />
              </div>
              <Button
                variant='ghost'
                className='text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40 dark:text-red-300 dark:hover:text-red-200'
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
                      className='text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/40 dark:text-red-300 dark:hover:text-red-200'
                      onClick={event => {
                        event.stopPropagation()
                        if (!address) return
                        removeLesson({ lessonId: lesson._id, address })
                        if (selectedLesson?._id === lesson._id) {
                          setSelectedLesson(null)
                        }
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
      <div className='flex-grow space-y-4 md:w-3/4'>
        <div className='rounded-xl border border-border bg-card p-4 shadow-sm'>
          <div className='space-y-4'>
            <div className='space-y-1'>
              <h2 className='text-sm font-semibold text-foreground'>
                Course thumbnail
              </h2>
              <p className='text-xs text-muted-foreground'>
                Learners see this image in the classroom grid and course overview.
              </p>
            </div>
            <Tabs
              value={thumbnailTab}
              onValueChange={value => setThumbnailTab(value as 'upload' | 'link')}
              className='space-y-3'
            >
              <TabsList className='grid w-full grid-cols-2'>
                <TabsTrigger value='upload' className='flex items-center gap-2'>
                  <UploadCloud className='h-4 w-4' />
                  Upload
                </TabsTrigger>
                <TabsTrigger value='link' className='flex items-center gap-2'>
                  <Link2 className='h-4 w-4' />
                  Link
                </TabsTrigger>
              </TabsList>
              <TabsContent value='upload'>
                <MediaDropzone
                  accept='image/*'
                  onSelect={files => {
                    void handleThumbnailFiles(files)
                  }}
                  disabled={thumbnailPending || isUploadingThumbnail}
                  uploading={isUploadingThumbnail}
                  dropAreaClassName='min-h-[200px] p-4'
                >
                  {thumbnailPreviewLoading ? (
                    <Skeleton className='h-[200px] w-full rounded-lg' />
                  ) : thumbnailPreviewUrl ? (
                    <div className='relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted'>
                      <Image
                        src={thumbnailPreviewUrl}
                        alt={`${course.title} thumbnail`}
                        fill
                        className='object-cover'
                        sizes='360px'
                      />
                    </div>
                  ) : (
                    <div className='flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground'>
                      <ImageIcon className='h-6 w-6' />
                      <span>Drag & drop an image to represent your course.</span>
                      <span className='text-xs text-muted-foreground'>
                        PNG, JPG, or GIF up to 5MB.
                      </span>
                    </div>
                  )}
                </MediaDropzone>
                {canRemoveThumbnail && (
                  <div className='mt-2 flex justify-end'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        void handleClearThumbnail()
                      }}
                      disabled={thumbnailPending || isUploadingThumbnail}
                    >
                      <X className='mr-2 h-4 w-4' />
                      Remove
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value='link'>
                <div className='space-y-2'>
                  <Input
                    placeholder='https://example.com/thumbnail.jpg'
                    value={thumbnailLinkInput}
                    onChange={event => setThumbnailLinkInput(event.target.value)}
                    onBlur={() => {
                      void handleThumbnailLinkCommit()
                    }}
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleThumbnailLinkCommit()
                      }
                    }}
                    disabled={thumbnailPending || isUploadingThumbnail}
                  />
                  <p className='text-xs text-muted-foreground'>
                    Paste a direct image URL. JPG, PNG, or GIF files work best.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            <div className='space-y-2'>
              <h2 className='text-sm font-semibold text-foreground'>
                Course description
              </h2>
              <Textarea
                value={courseDescription}
                onChange={event => setCourseDescription(event.target.value)}
                onBlur={() => {
                  void handleDescriptionBlur()
                }}
                disabled={descriptionPending}
                rows={4}
              />
              <p className='text-xs text-muted-foreground'>
                Keep this concise—learners see it on the classroom landing view.
              </p>
            </div>
          </div>
        </div>
        <div className='rounded-xl border border-border bg-card p-4 shadow-sm'>
          {selectedLesson ? (
            <LessonEditorView lesson={selectedLesson} />
          ) : (
            <div className='flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground'>
              <p>Select a lesson from the sidebar to edit its content.</p>
              <p>If this module is empty, add a lesson to begin crafting the curriculum.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
