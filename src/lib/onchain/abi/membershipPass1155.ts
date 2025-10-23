import type { Abi } from 'viem'

export const membershipPass1155Abi = [
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'uint256', name: 'priceUSDC', type: 'uint256' },
      { internalType: 'address', name: 'splitter', type: 'address' },
      { internalType: 'address', name: 'creator', type: 'address' },
      { internalType: 'uint64', name: 'duration', type: 'uint64' },
      { internalType: 'uint64', name: 'transferCooldown', type: 'uint64' }
    ],
    name: 'createCourse',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'courseId', type: 'uint256' }
    ],
    name: 'hasPass',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'courseId', type: 'uint256' }],
    name: 'getCourse',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'priceUSDC', type: 'uint256' },
          { internalType: 'address', name: 'splitter', type: 'address' },
          { internalType: 'address', name: 'creator', type: 'address' },
          { internalType: 'uint64', name: 'duration', type: 'uint64' },
          { internalType: 'uint64', name: 'transferCooldown', type: 'uint64' }
        ],
        internalType: 'struct MembershipPass1155.Course',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'address', name: 'account', type: 'address' }
    ],
    name: 'getPassState',
    outputs: [
      {
        components: [
          { internalType: 'uint64', name: 'expiresAt', type: 'uint64' },
          { internalType: 'uint64', name: 'cooldownEndsAt', type: 'uint64' }
        ],
        internalType: 'struct MembershipPass1155.PassState',
        name: '',
        type: 'tuple'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'address', name: 'account', type: 'address' }
    ],
    name: 'isPassActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'address', name: 'account', type: 'address' }
    ],
    name: 'canTransfer',
    outputs: [
      { internalType: 'bool', name: 'eligible', type: 'bool' },
      { internalType: 'uint64', name: 'availableAt', type: 'uint64' },
      { internalType: 'uint64', name: 'expiresAt', type: 'uint64' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'uint256', name: 'newPriceUSDC', type: 'uint256' }
    ],
    name: 'setPrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'address', name: 'newSplitter', type: 'address' }
    ],
    name: 'setSplitter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'courseId', type: 'uint256' },
      { internalType: 'uint64', name: 'duration', type: 'uint64' },
      { internalType: 'uint64', name: 'transferCooldown', type: 'uint64' }
    ],
    name: 'setCourseConfig',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'account', type: 'address' },
      { internalType: 'address', name: 'operator', type: 'address' }
    ],
    name: 'isApprovedForAll',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'operator', type: 'address' },
      { internalType: 'bool', name: 'approved', type: 'bool' }
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const satisfies Abi
