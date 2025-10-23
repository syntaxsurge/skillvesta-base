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

  return (
    <header className='relative z-40 border-b border-border bg-background/80 backdrop-blur'>
      <div className='mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6'>
        <div className='flex items-center gap-3'>
          <Link href='/' className='hidden sm:block'>
            <Logo width={140} height={32} className='h-10 w-auto' />
          </Link>
          <GroupSwitcher />
          <Link
            href='/marketplace'
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              isMarketplace
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Marketplace
          </Link>
        </div>
        <div className='flex items-center gap-2'>
          <ThemeToggle />
          <WalletMenu />
        </div>
      </div>
    </header>
  )
}
