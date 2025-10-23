'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'

import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Feed', suffix: '' },
  { label: 'Classroom', suffix: '/classroom' },
  { label: 'Members', suffix: '/members' },
  { label: 'About', suffix: '/about' }
]

export function GroupNavTabs() {
  const pathname = usePathname()
  const params = useParams()
  const groupId = typeof params?.groupId === 'string' ? params.groupId : ''

  if (!groupId) {
    return null
  }

  return (
    <nav className='border-b border-border bg-muted/40'>
      <ul className='mx-auto flex max-w-6xl items-center gap-2 px-6'>
        {TABS.map(tab => {
          const href = `/${groupId}${tab.suffix}`
          const isActive =
            pathname === href ||
            (tab.suffix && pathname?.startsWith(`${href}/`))

          return (
            <li key={tab.suffix}>
              <Link
                href={href}
                className={cn(
                  'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-background text-foreground shadow'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
