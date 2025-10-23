import type { Abi } from 'viem'

export const badge1155Abi = [
  {
    inputs: [
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'courseId', type: 'uint256' }
    ],
    name: 'mintCompletion',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'recipients', type: 'address[]' },
      { internalType: 'uint256', name: 'courseId', type: 'uint256' }
    ],
    name: 'mintBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'string', name: 'newURI', type: 'string' }],
    name: 'setURI',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const satisfies Abi
