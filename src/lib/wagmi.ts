import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

import { BASE_CHAIN_ID } from '@/lib/config'

/**
 * Wagmi configuration limited to Base mainnet and Base Sepolia.
 * Follows Coinbase's Smart Wallet guidance:
 * https://docs.base.org/onchainkit/getting-started
 */
export function getWagmiConfig() {
  return createConfig({
    chains: [base, baseSepolia],
    connectors: [
      coinbaseWallet({
        appName: 'Skillvesta',
        /**
         * Prefer Smart Wallet onboarding so users can deploy
         * a Base Account without managing EOAs directly.
         */
        preference: 'smartWalletOnly'
      })
    ],
    storage: createStorage({
      storage: cookieStorage
    }),
    ssr: true,
    transports: {
      [base.id]: http(),
      [baseSepolia.id]: http()
    }
  })
}

export const ACTIVE_CHAIN = BASE_CHAIN_ID === base.id ? base : baseSepolia

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getWagmiConfig>
  }
}
