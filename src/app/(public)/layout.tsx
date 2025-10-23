import { AppNavbar } from '@/components/layout/app-navbar'

type PublicLayoutProps = {
  children: React.ReactNode
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <main className='flex min-h-screen flex-col'>
      <AppNavbar />
      <div className='flex-1'>{children}</div>
    </main>
  )
}
