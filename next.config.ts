import path from 'node:path'

import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), interest-cohort=(), usb=(), payment=(), accelerometer=(), autoplay=()'
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-src 'self' https: blob: data:",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",
      "connect-src 'self' https: http: ws: wss:"
    ].join('; ')
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=15552000; includeSubDomains'
  }
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  eslint: {
    ignoreDuringBuilds: true
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders
      }
    ]
  },
  webpack(config) {
    config.resolve.alias ??= {}
    config.resolve.alias['@react-native-async-storage/async-storage'] =
      path.resolve('./src/lib/async-storage-shim.ts')
    config.resolve.alias['@farcaster/frame-sdk'] = '@farcaster/miniapp-sdk'
    config.resolve.alias.punycode = 'punycode/'

    if (!config.infrastructureLogging) {
      config.infrastructureLogging = {}
    }
    config.infrastructureLogging.level = 'error'

    const ignoreWarnings = Array.isArray(config.ignoreWarnings)
      ? config.ignoreWarnings
      : []
    config.ignoreWarnings = [
      ...ignoreWarnings,
      (warning: unknown) => {
        const message = String(
          (warning as { message?: string })?.message ?? warning ?? ''
        )
        return (
          message.includes('PackFileCacheStrategy') ||
          message.includes('Serializing big strings')
        )
      }
    ]

    return config
  }
}

export default nextConfig
