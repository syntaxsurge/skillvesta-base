import type { Abi } from 'viem'

export const membershipMarketplaceAbi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'uint256', name: 'maxPrice', type: 'uint256' }
    ],
    name: 'purchasePrimary',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'uint256', name: 'priceUSDC', type: 'uint256' },
      { internalType: 'uint64', name: 'durationSeconds', type: 'uint64' }
    ],
    name: 'createListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'courseId', type: 'uint256' }],
    name: 'cancelListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'address', name: 'seller', type: 'address' },
      { internalType: 'uint256', name: 'maxPrice', type: 'uint256' }
    ],
    name: 'buyListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'uint256', name: 'maxPrice', type: 'uint256' }
    ],
    name: 'renew',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'address', name: 'seller', type: 'address' }
    ],
    name: 'getListing',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'seller', type: 'address' },
          { internalType: 'uint256', name: 'priceUSDC', type: 'uint256' },
          { internalType: 'uint64', name: 'listedAt', type: 'uint64' },
          { internalType: 'uint64', name: 'expiresAt', type: 'uint64' },
          { internalType: 'bool', name: 'active', type: 'bool' }
        ],
        internalType: 'struct MembershipMarketplace.Listing',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'courseId', type: 'uint256' }],
    name: 'getActiveListings',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'seller', type: 'address' },
          { internalType: 'uint256', name: 'priceUSDC', type: 'uint256' },
          { internalType: 'uint64', name: 'listedAt', type: 'uint64' },
          { internalType: 'uint64', name: 'expiresAt', type: 'uint64' },
          { internalType: 'bool', name: 'active', type: 'bool' }
        ],
        internalType: 'struct MembershipMarketplace.Listing[]',
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint96', name: 'newFeeBps', type: 'uint96' }],
    name: 'setPlatformFeeBps',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'platformFeeBps',
    outputs: [{ internalType: 'uint96', name: '', type: 'uint96' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'treasury',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'maxListingDuration',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'newTreasury', type: 'address' }],
    name: 'setTreasury',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint64', name: 'newDuration', type: 'uint64' }],
    name: 'setMaxListingDuration',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'pause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'unpause',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const satisfies Abi
