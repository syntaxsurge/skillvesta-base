'use client'

import { ReactNode, useMemo } from 'react'

import { OnchainKitProvider } from '@coinbase/onchainkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, useChainId } from 'wagmi'
import { ThemeProvider as NextThemeProvider } from 'next-themes'
import { base, baseSepolia } from 'wagmi/chains'

import { ONCHAINKIT_API_KEY, getBaseRpcUrl } from '@/lib/config'
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
        name: 'Skillvesta',
        mode: 'auto' as const,
        theme: 'default' as const
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
    <NextThemeProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicOnchainKitProvider apiKey={apiKey} config={onchainKitConfig}>
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </DynamicOnchainKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </NextThemeProvider>
  )
}

type DynamicOnchainKitProviderProps = {
  apiKey?: string
  config: Parameters<typeof OnchainKitProvider>[0]['config']
  children: ReactNode
}

function DynamicOnchainKitProvider({
  apiKey,
  config,
  children
}: DynamicOnchainKitProviderProps) {
  const chainId = useChainId()
  const activeChain =
    chainId === base.id
      ? base
      : chainId === baseSepolia.id
        ? baseSepolia
        : ACTIVE_CHAIN
  const rpcUrl = getBaseRpcUrl(activeChain.id as 8453 | 84532)

  return (
    <OnchainKitProvider apiKey={apiKey} chain={activeChain} rpcUrl={rpcUrl} config={config}>
      {children}
    </OnchainKitProvider>
  )
}
