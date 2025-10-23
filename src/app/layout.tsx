import { Inter } from 'next/font/google'

import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'

import { AppProviders } from '@/providers/app-providers'

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
    <html lang='en'>
      <body className={inter.className}>
        <AppProviders>
          <Toaster />
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
