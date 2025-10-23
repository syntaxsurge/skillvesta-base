'use client'

import { useQuery } from 'convex/react'

import { LoadingIndicator } from '@/components/feedback/loading-indicator'
import { api } from '@/convex/_generated/api'
import type { Doc } from '@/convex/_generated/dataModel'
import { GroupMemberCard } from '@/features/groups/components/group-member-card'
import { MemberInviteForm } from '@/features/groups/components/member-invite-form'
import { useGroupContext } from '@/features/groups/context/group-context'

type GroupMembersPageProps = {
  params: Promise<{
    groupId: string
  }>
}

export default function GroupMembersPage(_: GroupMembersPageProps) {
  const { group, isOwner } = useGroupContext()
  const members = useQuery(api.groups.getMembers, {
    id: group._id
  }) as Array<Doc<'users'>> | undefined

  if (members === undefined) {
    return <LoadingIndicator fullScreen />
  }

  return (
    <div className='space-y-6'>
      {isOwner && <MemberInviteForm groupId={group._id} />}

      <div className='space-y-4'>
        {members.map(member => (
          <GroupMemberCard key={member._id} member={member} />
        ))}
      </div>
    </div>
  )
}
