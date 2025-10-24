'use client'

import { useState } from 'react'

import { useAccount } from 'wagmi'
import { useAppRouter } from '@/hooks/use-app-router'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
    <div className='relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/30'>
      {/* Decorative background elements */}
      <div className='absolute inset-0 overflow-hidden'>
        <div className='absolute -left-4 top-0 h-72 w-72 rounded-full bg-primary/5 blur-3xl' />
        <div className='absolute -right-4 top-1/3 h-64 w-64 rounded-full bg-accent/5 blur-3xl' />
        <div className='absolute bottom-0 left-1/2 h-56 w-56 rounded-full bg-primary/5 blur-3xl' />
      </div>

      <div className='relative mx-auto flex min-h-screen max-w-7xl flex-col gap-12 px-6 py-16'>
        {/* Hero Section */}
        <div className='relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-10 py-16 text-white shadow-2xl md:px-14'>
          <div className='absolute -right-12 top-12 h-72 w-72 rounded-full bg-primary/20 blur-3xl' />
          <div className='absolute -bottom-12 left-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl' />

          <div className='relative space-y-6'>
            <div className='inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm'>
              <div className='h-2 w-2 rounded-full bg-primary animate-pulse' />
              <p className='text-xs font-semibold uppercase tracking-wider text-white/90'>
                Course Creator
              </p>
            </div>

            <h1 className='text-5xl font-bold leading-tight sm:text-6xl'>
              Create & Share
              <br />
              <span className='bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent'>
                Your Knowledge
              </span>
            </h1>

            <p className='max-w-2xl text-lg leading-relaxed text-slate-300'>
              Build engaging online courses and share your expertise with learners worldwide.
              Drive exceptional learning outcomes with our seamless course creation platform.
            </p>
          </div>
        </div>

        {/* Main Content: Features + Form */}
        <div className='grid gap-8 lg:grid-cols-2'>
          {/* Features Section */}
          <div className='space-y-6'>
            <div>
              <h2 className='text-2xl font-bold text-foreground'>
                Why Create a Course?
              </h2>
              <p className='mt-2 text-sm text-muted-foreground'>
                Everything you need to build and launch successful online courses
              </p>
            </div>

            <div className='grid gap-4'>
              <FeatureCard
                icon='🎓'
                title='Share Your Expertise'
                description='Create and share your knowledge with the world through engaging online courses'
              />
              <FeatureCard
                icon='🚀'
                title='Drive Learning Outcomes'
                description='Help learners achieve their goals with structured, impactful content'
              />
              <FeatureCard
                icon='💖'
                title='Seamless Setup'
                description='Set up your course quickly with our intuitive creation tools'
              />
              <FeatureCard
                icon='💸'
                title='Monetize Your Knowledge'
                description='Generate revenue through course enrollment and membership access'
              />
              <FeatureCard
                icon='🌍'
                title='Global Reach'
                description='Connect with learners worldwide through web and mobile platforms'
              />
              <FeatureCard
                icon='😄'
                title='Delightful Experience'
                description='Provide an enjoyable learning journey with modern course delivery'
              />
            </div>
          </div>

          {/* Form Section */}
          <div className='flex flex-col'>
            <div className='rounded-xl border border-border/50 bg-card/80 p-8 shadow-lg backdrop-blur-sm'>
              <div className='space-y-6'>
                <div>
                  <h2 className='text-2xl font-bold text-foreground'>
                    Create a Course
                  </h2>
                  <p className='mt-2 text-sm text-muted-foreground'>
                    Start building your course today. Add content, modules, and lessons after creation.
                  </p>
                </div>

                <div className='space-y-5'>
                  <div className='space-y-2'>
                    <label
                      htmlFor='course-title'
                      className='text-sm font-semibold text-foreground'
                    >
                      Course Title
                    </label>
                    <Input
                      id='course-title'
                      placeholder='e.g., Introduction to Web Development'
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className='h-12'
                    />
                    <p className='text-xs text-muted-foreground'>
                      Give your course a clear, descriptive title
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <label
                      htmlFor='course-description'
                      className='text-sm font-semibold text-foreground'
                    >
                      Course Description
                    </label>
                    <Textarea
                      id='course-description'
                      placeholder='Describe what learners will gain from this course...'
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className='min-h-[120px] resize-none'
                    />
                    <p className='text-xs text-muted-foreground'>
                      Explain the key learning outcomes and benefits
                    </p>
                  </div>

                  <Button
                    onClick={handleCreate}
                    disabled={pending || !title.trim()}
                    className='h-12 w-full text-base font-semibold'
                    size='lg'
                  >
                    {pending ? 'Creating...' : 'Create Course'}
                  </Button>
                </div>

                {!address && (
                  <div className='rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                    Please connect your wallet to create a course
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className='group rounded-xl border border-border/50 bg-card/60 p-5 backdrop-blur-sm transition-all hover:bg-card/80 hover:shadow-md'>
      <div className='flex items-start gap-4'>
        <div className='flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-2xl'>
          {icon}
        </div>
        <div className='flex-1 space-y-1'>
          <h3 className='font-semibold text-foreground'>{title}</h3>
          <p className='text-sm leading-relaxed text-muted-foreground'>
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

export default CreateCourse
