'use client'

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletAdvancedAddressDetails,
  WalletAdvancedTokenHoldings,
  WalletAdvancedTransactionActions,
  WalletAdvancedWalletActions
} from '@coinbase/onchainkit/wallet'
import { Check, ChevronDown } from 'lucide-react'
import { useChainId, useSwitchChain } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type ChainId = (typeof base)['id'] | (typeof baseSepolia)['id']

type ChainOption = {
  id: ChainId
  name: string
  shortName: string
}

const CHAINS: ChainOption[] = [
  { id: base.id as ChainId, name: 'Base', shortName: 'Mainnet' },
  { id: baseSepolia.id as ChainId, name: 'Base Sepolia', shortName: 'Sepolia' }
]

function BaseLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='16'
      height='16'
      viewBox='0 0 28 28'
      className={className}
      aria-hidden='true'
      focusable='false'
    >
      <g fill='none' fillRule='evenodd'>
        <path fill='#0052FF' fillRule='nonzero' d='M14 28a14 14 0 1 0 0-28 14 14 0 0 0 0 28Z' />
        <path
          fill='#FFF'
          d='M13.967 23.86c5.445 0 9.86-4.415 9.86-9.86 0-5.445-4.415-9.86-9.86-9.86-5.166 0-9.403 3.974-9.825 9.03h14.63v1.642H4.142c.413 5.065 4.654 9.047 9.826 9.047Z'
        />
      </g>
    </svg>
  )
}

function ChainSwitcher() {
  const currentChainId = useChainId()
  const { switchChain, isPending } = useSwitchChain()

  const currentChain = CHAINS.find((chain) => chain.id === currentChainId) ?? CHAINS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type='button'
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-sm font-medium shadow-sm transition',
            'hover:bg-accent/50 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
          aria-label='Select network'
        >
          <BaseLogo className='h-4 w-4' />
          <span className='hidden sm:inline'>
            {currentChain.name}
            <span className='text-muted-foreground ml-1'>({currentChain.shortName})</span>
          </span>
          <ChevronDown className='h-3 w-3' aria-hidden='true' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        {CHAINS.map((chain) => (
          <DropdownMenuItem
            key={chain.id}
            onSelect={() => {
              if (chain.id !== currentChainId) {
                switchChain({ chainId: chain.id })
              }
            }}
            disabled={isPending}
            className='flex items-center gap-2'
          >
            <BaseLogo className='h-4 w-4 flex-shrink-0' />
            <span className='flex-1'>
              {chain.name}{' '}
              <span className='text-muted-foreground'>({chain.shortName})</span>
            </span>
            {chain.id === currentChainId && <Check className='text-primary h-4 w-4' />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function WalletMenu() {
  return (
    <div className='flex items-center gap-2'>
      <ChainSwitcher />
      <Wallet>
        <ConnectWallet />
        <WalletDropdown className='z-50'>
          <WalletAdvancedWalletActions />
          <WalletAdvancedAddressDetails />
          <WalletAdvancedTransactionActions />
          <WalletAdvancedTokenHoldings />
        </WalletDropdown>
      </Wallet>
    </div>
  )
}
