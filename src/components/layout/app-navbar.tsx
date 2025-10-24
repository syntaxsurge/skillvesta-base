'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { GroupSwitcher } from './group-switcher'
import { Logo } from './logo'
import { WalletMenu } from './wallet-menu'
import { ThemeToggle } from './theme-toggle'

export function AppNavbar() {
  const pathname = usePathname()
  const isMarketplace = pathname?.startsWith('/marketplace')
  const isMemberships = pathname?.startsWith('/memberships')

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-card'>
      <div className='mx-auto flex h-16 w-full items-center justify-between gap-6 px-6'>
        <div className='flex items-center gap-6'>
          <Link href='/' className='hidden sm:block'>
            <Logo width={140} height={32} className='h-8 w-auto' />
          </Link>
          <GroupSwitcher />
          <nav className='flex items-center gap-2'>
            <Link
              href='/marketplace'
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isMarketplace
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Marketplace
            </Link>
            <Link
              href='/memberships'
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                isMemberships
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My memberships
            </Link>
          </nav>
        </div>
        <div className='flex items-center gap-3'>
          <ThemeToggle />
          <WalletMenu />
        </div>
      </div>
    </header>
  )
}
