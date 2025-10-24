'use client'

import Image from 'next/image'

import { cn } from '@/lib/utils'

const BASE_WIDTH = 190
const BASE_HEIGHT = 40
const ASPECT_RATIO = BASE_WIDTH / BASE_HEIGHT

interface LogoProps {
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

export const Logo = ({
  className,
  width,
  height,
  priority = true
}: LogoProps) => {
  let resolvedWidth = width
  let resolvedHeight = height

  if (resolvedWidth && !resolvedHeight) {
    resolvedHeight = Math.round(resolvedWidth / ASPECT_RATIO)
  } else if (!resolvedWidth && resolvedHeight) {
    resolvedWidth = Math.round(resolvedHeight * ASPECT_RATIO)
  }

  resolvedWidth ??= BASE_WIDTH
  resolvedHeight ??= BASE_HEIGHT

  return (
    <Image
      src='/images/skillvesta-logo.png'
      alt='Skillvesta'
      width={resolvedWidth}
      height={resolvedHeight}
      priority={priority}
      className={cn('h-auto w-auto', className)}
    />
  )
}
