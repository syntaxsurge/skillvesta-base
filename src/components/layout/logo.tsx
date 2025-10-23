'use client'

import Image from 'next/image'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  width?: number
  height?: number
}

export const Logo = ({ className, width = 190, height = 40 }: LogoProps) => {
  return (
    <Image
      src='/images/skillvesta-logo.png'
      alt='Skillvesta'
      width={width}
      height={height}
      priority
      className={cn('h-auto w-auto', className)}
    />
  )
}
