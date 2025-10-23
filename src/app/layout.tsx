import { Inter } from 'next/font/google'

import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

import { AppProviders } from '@/providers/app-providers'
import { AppNavbar } from '@/components/layout/app-navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Skillvesta',
  description: 'Learning communities powered by Base accounts.'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className={inter.className}>
        <AppProviders>
          <div className='flex min-h-screen flex-col'>
            <AppNavbar />
            <main className='flex-1'>{children}</main>
          </div>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  )
}
