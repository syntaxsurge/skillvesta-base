import type { Id } from '@/convex/_generated/dataModel'
import { GroupLayoutShell } from '@/features/groups/components/group-layout-shell'

type GroupLayoutProps = {
  children: React.ReactNode
  params: Promise<{
    groupId: string
  }>
}

export default async function GroupLayout({
  children,
  params
}: GroupLayoutProps) {
  const resolvedParams = await params
  const groupId = resolvedParams.groupId as Id<'groups'>

  return (
    <GroupLayoutShell groupId={groupId}>{children}</GroupLayoutShell>
  )
}
