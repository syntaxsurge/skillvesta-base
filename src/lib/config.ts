/**
 * Environment-driven configuration for Base & OnchainKit integrations.
 * Values resolve at runtime so server and client both consume the same source.
 *
 * Reference:
 * - https://docs.base.org/get-started/base
 * - https://docs.base.org/onchainkit/getting-started
 */

/** Default to Base Sepolia when chain id is not provided. */
const DEFAULT_CHAIN_ID = 84532

export const BASE_CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_BASE_CHAIN_ID ?? DEFAULT_CHAIN_ID
) as 8453 | 84532

export const ONCHAINKIT_API_KEY =
  process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ?? ''

const DEFAULT_BASE_MAINNET_RPC_URL = 'https://developer-access-mainnet.base.org'
const DEFAULT_BASE_SEPOLIA_RPC_URL = 'https://sepolia.base.org'

const ENV_BASE_MAINNET_RPC_URL = process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL
const ENV_BASE_SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL
const LEGACY_BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL

export const BASE_MAINNET_RPC_URL =
  ENV_BASE_MAINNET_RPC_URL ?? LEGACY_BASE_RPC_URL ?? DEFAULT_BASE_MAINNET_RPC_URL

export const BASE_SEPOLIA_RPC_URL =
  ENV_BASE_SEPOLIA_RPC_URL ?? DEFAULT_BASE_SEPOLIA_RPC_URL

export function getBaseRpcUrl(chainId: 8453 | 84532) {
  return chainId === 8453 ? BASE_MAINNET_RPC_URL : BASE_SEPOLIA_RPC_URL
}

export const BASE_RPC_URL = getBaseRpcUrl(BASE_CHAIN_ID)

/** USDC contract address for Base mainnet or Sepolia. */
export const USDC_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_CONTRACT_ADDRESS ??
  '0xd9aAEc86B65D86f6A7B5b1b0c42FFA531710b6CA' // Base Sepolia default

/** Destination that receives subscription funds in USDC. */
export const PLATFORM_TREASURY_ADDRESS =
  process.env.NEXT_PUBLIC_PLATFORM_TREASURY_ADDRESS ?? ''

export const MEMBERSHIP_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_MEMBERSHIP_CONTRACT_ADDRESS ?? ''

export const BADGE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_BADGE_CONTRACT_ADDRESS ?? ''

export const REGISTRAR_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_REGISTRAR_CONTRACT_ADDRESS ?? ''

export const MARKETPLACE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS ?? ''

export const REVENUE_SPLIT_ROUTER_ADDRESS =
  process.env.NEXT_PUBLIC_REVENUE_SPLIT_ROUTER_ADDRESS ?? ''

export const SUBSCRIPTION_PRICE_USDC =
  process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_USDC ?? '99'

const DEFAULT_MEMBERSHIP_DURATION_SECONDS = 60 * 60 * 24 * 30
const DEFAULT_MEMBERSHIP_TRANSFER_COOLDOWN_SECONDS = 60 * 60 * 24

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

export const MEMBERSHIP_DURATION_SECONDS = parsePositiveInt(
  process.env.NEXT_PUBLIC_MEMBERSHIP_DURATION_SECONDS,
  DEFAULT_MEMBERSHIP_DURATION_SECONDS
)

export const MEMBERSHIP_TRANSFER_COOLDOWN_SECONDS = parsePositiveInt(
  process.env.NEXT_PUBLIC_MEMBERSHIP_TRANSFER_COOLDOWN_SECONDS,
  DEFAULT_MEMBERSHIP_TRANSFER_COOLDOWN_SECONDS
)
