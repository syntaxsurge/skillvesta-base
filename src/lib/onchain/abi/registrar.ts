import type { Abi } from 'viem'

export const registrarAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'uint256', name: 'priceUSDC', type: 'uint256' },
      { internalType: 'address[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint32[]', name: 'sharesBps', type: 'uint32[]' },
      { internalType: 'uint64', name: 'duration', type: 'uint64' },
      { internalType: 'uint64', name: 'transferCooldown', type: 'uint64' }
    ],
    name: 'registerCourse',
    outputs: [
      { internalType: 'address', name: 'splitterAddress', type: 'address' }
    ],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'marketplace',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'marketplaceAddress', type: 'address' }],
    name: 'setMarketplace',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const satisfies Abi
