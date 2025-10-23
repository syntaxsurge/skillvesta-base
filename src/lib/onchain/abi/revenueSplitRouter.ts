export const revenueSplitRouterAbi = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address'
      },
      {
        internalType: 'address[]',
        name: 'recipients',
        type: 'address[]'
      },
      {
        internalType: 'uint32[]',
        name: 'sharesBps',
        type: 'uint32[]'
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'splitTransfer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const
