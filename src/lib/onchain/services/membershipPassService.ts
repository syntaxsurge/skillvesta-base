import type { Account, Address } from 'viem'

import { membershipPass1155Abi } from '@/lib/onchain/abi'

import { OnchainService, ServiceConfig } from './base'

export type CourseData = {
  priceUSDC: bigint
  splitter: Address
  creator: Address
  duration: bigint
  transferCooldown: bigint
}

type ReadCourseResult = [bigint, Address, Address, bigint, bigint]
type PassStateTuple = [bigint, bigint]
type TransferCheckTuple = [boolean, bigint, bigint]

export class MembershipPassService extends OnchainService {
  readonly address: Address

  constructor(config: ServiceConfig & { address: Address }) {
    super(config)
    this.address = config.address
  }

  async hasPass(user: Address, courseId: bigint) {
    return this.publicClient.readContract({
      abi: membershipPass1155Abi,
      address: this.address,
      functionName: 'hasPass',
      args: [user, courseId]
    }) as Promise<boolean>
  }

  async getCourse(courseId: bigint): Promise<CourseData> {
    const [priceUSDC, splitter, creator, duration, transferCooldown] =
      (await this.publicClient.readContract({
        abi: membershipPass1155Abi,
        address: this.address,
        functionName: 'getCourse',
        args: [courseId]
      })) as unknown as ReadCourseResult

    return {
      priceUSDC,
      splitter,
      creator,
      duration,
      transferCooldown
    }
  }

  async getPassState(courseId: bigint, account: Address) {
    const [expiresAt, cooldownEndsAt] =
      (await this.publicClient.readContract({
        abi: membershipPass1155Abi,
        address: this.address,
        functionName: 'getPassState',
        args: [courseId, account]
      })) as unknown as PassStateTuple

    return { expiresAt, cooldownEndsAt }
  }

  async isPassActive(courseId: bigint, account: Address) {
    return this.publicClient.readContract({
      abi: membershipPass1155Abi,
      address: this.address,
      functionName: 'isPassActive',
      args: [courseId, account]
    }) as Promise<boolean>
  }

  async canTransfer(courseId: bigint, account: Address) {
    const [eligible, availableAt, expiresAt] =
      (await this.publicClient.readContract({
        abi: membershipPass1155Abi,
        address: this.address,
        functionName: 'canTransfer',
        args: [courseId, account]
      })) as unknown as TransferCheckTuple

    return { eligible, availableAt, expiresAt }
  }

  async setPrice(
    courseId: bigint,
    newPrice: bigint,
    opts?: { account?: Account | Address }
  ) {
    const wallet = this.requireWalletClient()
    const account = this.resolveAccount(opts?.account)
    return wallet.writeContract({
      abi: membershipPass1155Abi,
      address: this.address,
      functionName: 'setPrice',
      args: [courseId, newPrice],
      account
    })
  }

  async setSplitter(
    courseId: bigint,
    splitter: Address,
    opts?: { account?: Account | Address }
  ) {
    const wallet = this.requireWalletClient()
    const account = this.resolveAccount(opts?.account)
    return wallet.writeContract({
      abi: membershipPass1155Abi,
      address: this.address,
      functionName: 'setSplitter',
      args: [courseId, splitter],
      account
    })
  }

  async setCourseConfig(
    courseId: bigint,
    duration: bigint,
    transferCooldown: bigint,
    opts?: { account?: Account | Address }
  ) {
    const wallet = this.requireWalletClient()
    const account = this.resolveAccount(opts?.account)
    return wallet.writeContract({
      abi: membershipPass1155Abi,
      address: this.address,
      functionName: 'setCourseConfig',
      args: [courseId, duration, transferCooldown],
      account
    })
  }

  async isApprovedForAll(owner: Address, operator: Address) {
    return this.publicClient.readContract({
      abi: membershipPass1155Abi,
      address: this.address,
      functionName: 'isApprovedForAll',
      args: [owner, operator]
    }) as Promise<boolean>
  }

  async setApprovalForAll(
    operator: Address,
    approved: boolean,
    opts?: { account?: Account | Address }
  ) {
    const wallet = this.requireWalletClient()
    const account = this.resolveAccount(opts?.account)
    return wallet.writeContract({
      abi: membershipPass1155Abi,
      address: this.address,
      functionName: 'setApprovalForAll',
      args: [operator, approved],
      account
    })
  }
}
