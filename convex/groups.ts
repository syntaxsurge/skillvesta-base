import { v } from 'convex/values'

import { Doc } from './_generated/dataModel'
import { internalMutation, mutation, query } from './_generated/server'
import { getUserByWallet, requireUserByWallet } from './utils'

function normalizeTimestamp(timestamp: number) {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
}

const DEFAULT_SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000

export const create = mutation({
  args: {
    ownerAddress: v.string(),
    name: v.string(),
    description: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const owner = await requireUserByWallet(ctx, args.ownerAddress)
    const now = Date.now()

    const groupId = await ctx.db.insert('groups', {
      name: args.name,
      description: args.description,
      ownerId: owner._id,
      endsOn: now + DEFAULT_SUBSCRIPTION_DURATION_MS,
      price: 0,
      memberNumber: 1
    })

    await ctx.db.insert('userGroups', {
      userId: owner._id,
      groupId
    })

    return groupId
  }
})

export const get = query({
  args: { id: v.optional(v.id('groups')) },
  handler: async (ctx, { id }) => {
    if (!id) {
      return null
    }
    const group = await ctx.db.get(id)
    return group
  }
})

export const list = query({
  args: { address: v.optional(v.string()) },
  handler: async (ctx, { address }) => {
    if (!address) {
      return []
    }

    const user = await getUserByWallet(ctx, address)
    if (!user) {
      return []
    }

    const userGroups = await ctx.db
      .query('userGroups')
      .withIndex('by_userId', q => q.eq('userId', user._id))
      .collect()

    const groups = userGroups.map(async userGroup => {
      const group = await ctx.db.get(userGroup.groupId)
      return group
    })

    const resolvedGroups = await Promise.all(groups)
    const filteredGroups = resolvedGroups.filter(
      group => group !== null
    ) as Doc<'groups'>[]

    return filteredGroups
  }
})

export const getMembers = query({
  args: { id: v.id('groups') },
  handler: async (ctx, { id }) => {
    const members = await ctx.db
      .query('userGroups')
      .withIndex('by_groupId', q => q.eq('groupId', id))
      .collect()

    const resolvedMembers = await Promise.all(
      members.map(async member => {
        const user = await ctx.db.get(member.userId)
        return user
      })
    )

    const filteredMembers = resolvedMembers.filter(
      member => member !== null
    ) as Doc<'users'>[]

    return filteredMembers
  }
})

export const listAll = query({
  args: {},
  handler: async ctx => {
    const groups = await ctx.db.query('groups').collect()
    return groups
  }
})

export const updateName = mutation({
  args: { id: v.id('groups'), name: v.string(), ownerAddress: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireUserByWallet(ctx, args.ownerAddress)
    const group = await ctx.db.get(args.id)

    if (!group) {
      throw new Error('Group not found.')
    }

    if (group.ownerId !== owner._id) {
      throw new Error('Only the owner can update the group name.')
    }

    const name = args.name.trim()

    if (!name) {
      throw new Error('name is required')
    }

    if (name.length > 60) {
      throw new Error('name cannot be longer than 60 characters')
    }

    await ctx.db.patch(args.id, {
      name: args.name
    })
  }
})

export const updateDescription = mutation({
  args: {
    id: v.id('groups'),
    description: v.string(),
    ownerAddress: v.string()
  },
  handler: async (ctx, args) => {
    const owner = await requireUserByWallet(ctx, args.ownerAddress)
    const group = await ctx.db.get(args.id)

    if (!group) {
      throw new Error('Group not found.')
    }

    if (group.ownerId !== owner._id) {
      throw new Error('Only the owner can update the description.')
    }

    const description = args.description.trim()

    if (!description) {
      throw new Error('Description is required')
    }

    if (description.length > 40000) {
      throw new Error('Description is too long.')
    }

    await ctx.db.patch(args.id, {
      description: args.description
    })
  }
})

export const updateSubscription = internalMutation({
  args: {
    subscriptionId: v.string(),
    groupId: v.id('groups'),
    endsOn: v.number()
  },
  handler: async (ctx, { subscriptionId, groupId, endsOn }) => {
    await ctx.db.patch(groupId, {
      subscriptionId,
      endsOn: normalizeTimestamp(endsOn)
    })
  }
})

export const updateSubscriptionById = internalMutation({
  args: { subscriptionId: v.string(), endsOn: v.number() },
  handler: async (ctx, { subscriptionId, endsOn }) => {
    const user = await ctx.db
      .query('groups')
      .withIndex('by_subscriptionId', q =>
        q.eq('subscriptionId', subscriptionId)
      )
      .unique()

    if (!user) {
      throw new Error('User not found!')
    }

    await ctx.db.patch(user._id, {
      endsOn: normalizeTimestamp(endsOn)
    })
  }
})
