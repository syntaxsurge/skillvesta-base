'use client'

import { ReactNode, useMemo } from 'react'

import { OnchainKitProvider } from '@coinbase/onchainkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'

import { ONCHAINKIT_API_KEY, BASE_RPC_URL } from '@/lib/config'
import { ACTIVE_CHAIN, getWagmiConfig } from '@/lib/wagmi'
import { ConvexClientProvider } from '@/providers/convex-client-provider'

type AppProvidersProps = {
  children: ReactNode
}

/**
 * Aggregates Wagmi, OnchainKit, TanStack Query, and Convex providers so the
 * rest of the app can interact with Base Smart Wallets + Convex backend.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const wagmiConfig = useMemo(() => getWagmiConfig(), [])
  const queryClient = useMemo(() => new QueryClient(), [])
  const apiKey = ONCHAINKIT_API_KEY || undefined
  const onchainKitConfig = useMemo(
    () => ({
      appearance: {
        name: 'Skillvesta'
      },
      wallet: {
        display: 'modal' as const,
        supportedWallets: {
          rabby: false,
          trust: false,
          frame: false
        }
      }
    }),
    []
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={apiKey}
          chain={ACTIVE_CHAIN}
          rpcUrl={BASE_RPC_URL}
          config={onchainKitConfig}
        >
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
