'use client'

import type { ReactNode } from 'react'

import { AppNavbar } from '@/components/layout/app-navbar'
import type { Id } from '@/convex/_generated/dataModel'

import { GroupNavTabs } from './group-nav-tabs'
import { GroupProvider } from '../context/group-context'

type GroupLayoutShellProps = {
  groupId: Id<'groups'>
  children: ReactNode
}

export function GroupLayoutShell({ groupId, children }: GroupLayoutShellProps) {
  return (
    <GroupProvider groupId={groupId}>
      <div className='flex min-h-screen flex-col'>
        <AppNavbar />
        <GroupNavTabs />
        <section className='mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10'>
          {children}
        </section>
      </div>
    </GroupProvider>
  )
}
