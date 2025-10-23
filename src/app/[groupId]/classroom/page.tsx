'use client'

import { CourseGrid } from '@/features/classroom/components/course-grid'
import { useGroupContext } from '@/features/groups/context/group-context'

type ClassroomPageProps = {
  params: Promise<{
    groupId: string
  }>
}

export default function ClassroomPage(_: ClassroomPageProps) {
  const { group, isOwner } = useGroupContext()

  return (
    <div className='space-y-6'>
      <CourseGrid groupId={group._id} canCreate={isOwner} />
    </div>
  )
}
