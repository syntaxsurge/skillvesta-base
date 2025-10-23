import { v } from 'convex/values'

import { Doc } from './_generated/dataModel'
import { internalMutation, mutation, query } from './_generated/server'
import { getUserByWallet, requireUserByWallet } from './utils'

function normalizeTimestamp(timestamp: number) {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp
}

const DEFAULT_SUBSCRIPTION_DURATION_MS = 30 * 24 * 60 * 60 * 1000
const MAX_TAGS = 8
const MAX_GALLERY_ITEMS = 10

type VisibilityOption = 'public' | 'private'
type BillingCadenceOption = 'free' | 'monthly'

function sanitizeUrl(value: string | undefined | null) {
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  try {
    return new URL(trimmed).toString()
  } catch {
    return undefined
  }
}

function sanitizeText(value: string | undefined | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function sanitizeTags(tags: string[] | undefined) {
  if (!tags?.length) return []
  const unique = Array.from(
    new Set(
      tags
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.toLowerCase())
    )
  )
  return unique.slice(0, MAX_TAGS)
}

function sanitizeGallery(urls: string[] | undefined) {
  if (!urls?.length) return []
  const sanitized = urls
    .map(url => sanitizeUrl(url))
    .filter((value): value is string => Boolean(value))
  return sanitized.slice(0, MAX_GALLERY_ITEMS)
}

function resolveVisibility(
  requested: VisibilityOption | undefined
): VisibilityOption {
  return requested === 'public' || requested === 'private'
    ? requested
    : 'private'
}

function resolveBillingCadence(
  requested: BillingCadenceOption | undefined,
  price: number
): BillingCadenceOption {
  if (requested === 'free' || requested === 'monthly') {
    if (requested === 'free' && price > 0) {
      return 'monthly'
    }
    if (requested === 'monthly' && price <= 0) {
      return 'free'
    }
    return requested
  }
  return price > 0 ? 'monthly' : 'free'
}

export const create = mutation({
  args: {
    ownerAddress: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    aboutUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    galleryUrls: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    visibility: v.optional(v.union(v.literal('public'), v.literal('private'))),
    billingCadence: v.optional(
      v.union(v.literal('free'), v.literal('monthly'))
    ),
    price: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const owner = await requireUserByWallet(ctx, args.ownerAddress)
    const now = Date.now()

     const price = typeof args.price === 'number' && args.price > 0 ? args.price : 0
     const visibility = resolveVisibility(args.visibility as VisibilityOption | undefined)
     const billingCadence = resolveBillingCadence(
       args.billingCadence as BillingCadenceOption | undefined,
       price
     )

    const groupId = await ctx.db.insert('groups', {
      name: args.name,
      description: args.description,
      shortDescription: sanitizeText(args.shortDescription),
      aboutUrl: sanitizeUrl(args.aboutUrl),
      thumbnailUrl: sanitizeUrl(args.thumbnailUrl),
      galleryUrls: sanitizeGallery(args.galleryUrls),
      tags: sanitizeTags(args.tags),
      visibility,
      billingCadence,
      ownerId: owner._id,
      endsOn: now + DEFAULT_SUBSCRIPTION_DURATION_MS,
      price,
      memberNumber: 1
    })

    await ctx.db.insert('userGroups', {
      userId: owner._id,
      groupId
    })

    return groupId
  }
})

export const updateSettings = mutation({
  args: {
    id: v.id('groups'),
    ownerAddress: v.string(),
    shortDescription: v.optional(v.string()),
    aboutUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    galleryUrls: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    visibility: v.optional(
      v.union(v.literal('public'), v.literal('private'))
    ),
    billingCadence: v.optional(
      v.union(v.literal('free'), v.literal('monthly'))
    ),
    price: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const owner = await requireUserByWallet(ctx, args.ownerAddress)
    const group = await ctx.db.get(args.id)

    if (!group) {
      throw new Error('Group not found.')
    }

    if (group.ownerId !== owner._id) {
      throw new Error('Only the owner can update group settings.')
    }

    const patch: Partial<Doc<'groups'>> = {}

    if (args.shortDescription !== undefined) {
      patch.shortDescription = sanitizeText(args.shortDescription)
    }

    if (args.aboutUrl !== undefined) {
      patch.aboutUrl = sanitizeUrl(args.aboutUrl)
    }

    if (args.thumbnailUrl !== undefined) {
      patch.thumbnailUrl = sanitizeUrl(args.thumbnailUrl)
    }

    if (args.galleryUrls !== undefined) {
      patch.galleryUrls = sanitizeGallery(args.galleryUrls)
    }

    if (args.tags !== undefined) {
      patch.tags = sanitizeTags(args.tags)
    }

    const resolvedVisibility =
      args.visibility !== undefined
        ? resolveVisibility(args.visibility as VisibilityOption)
        : resolveVisibility(group.visibility as VisibilityOption | undefined)
    patch.visibility = resolvedVisibility

    const incomingPrice =
      typeof args.price === 'number' ? Math.max(0, args.price) : undefined
    const nextPrice = incomingPrice ?? group.price ?? 0

    if (incomingPrice !== undefined) {
      patch.price = incomingPrice
    }

    const requestedCadence = args.billingCadence as
      | BillingCadenceOption
      | undefined
    const resolvedCadence = resolveBillingCadence(requestedCadence, nextPrice)
    patch.billingCadence = resolvedCadence

    await ctx.db.patch(args.id, patch)
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

export const viewer = query({
  args: {
    groupId: v.id('groups'),
    viewerId: v.optional(v.id('users'))
  },
  handler: async (ctx, { groupId, viewerId }) => {
    const group = await ctx.db.get(groupId)
    if (!group) {
      return null
    }

    const owner = await ctx.db.get(group.ownerId)

    let isMember = false
    if (viewerId) {
      const membership = await ctx.db
        .query('userGroups')
        .withIndex('by_userId', q => q.eq('userId', viewerId))
        .filter(q => q.eq(q.field('groupId'), groupId))
        .first()
      isMember = Boolean(membership)
    }

    const normalizedVisibility = resolveVisibility(
      group.visibility as VisibilityOption | undefined
    )

    const price = group.price ?? 0
    const normalizedBilling = resolveBillingCadence(
      group.billingCadence as BillingCadenceOption | undefined,
      price
    )

    const normalizedGroup: Doc<'groups'> = {
      ...group,
      visibility: normalizedVisibility,
      billingCadence: normalizedBilling,
      tags: group.tags ?? [],
      galleryUrls: group.galleryUrls ?? []
    }

    const isOwner = viewerId ? group.ownerId === viewerId : false
    const canAccessProtected =
      normalizedVisibility === 'public' || isMember || isOwner

    return {
      group: normalizedGroup,
      owner: owner ?? null,
      viewer: {
        isOwner,
        isMember,
        canAccess: {
          about: true,
          feed: canAccessProtected,
          classroom: canAccessProtected,
          members: canAccessProtected
        }
      },
      memberCount:
        typeof group.memberNumber === 'number' ? group.memberNumber : 0
    }
  }
})

export const getMembers = query({
  args: {
    id: v.id('groups'),
    viewerId: v.optional(v.id('users'))
  },
  handler: async (ctx, { id, viewerId }) => {
    const group = await ctx.db.get(id)

    if (!group) {
      return []
    }

    const visibility = resolveVisibility(
      group.visibility as VisibilityOption | undefined
    )

    let isOwner = false
    let isMember = false

    if (viewerId) {
      isOwner = group.ownerId === viewerId
      if (!isOwner) {
        const membership = await ctx.db
          .query('userGroups')
          .withIndex('by_userId', q => q.eq('userId', viewerId))
          .filter(q => q.eq(q.field('groupId'), id))
          .first()
        isMember = Boolean(membership)
      }
    }

    const canAccess =
      visibility === 'public' || isOwner || isMember

    if (!canAccess) {
      return []
    }

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

export const directory = query({
  args: {},
  handler: async ctx => {
    const groups = await ctx.db.query('groups').collect()

    const results = await Promise.all(
      groups.map(async group => {
        const owner = await ctx.db.get(group.ownerId)
        return {
          group: {
            ...group,
            tags: group.tags ?? [],
            galleryUrls: group.galleryUrls ?? [],
            visibility: resolveVisibility(
              group.visibility as VisibilityOption | undefined
            ),
            billingCadence: resolveBillingCadence(
              group.billingCadence as BillingCadenceOption | undefined,
              group.price ?? 0
            )
          } satisfies Doc<'groups'>,
          owner: owner ?? null,
          memberCount:
            typeof group.memberNumber === 'number' ? group.memberNumber : 0
        }
      })
    )

    return results
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

export const join = mutation({
  args: {
    groupId: v.id('groups'),
    memberAddress: v.string(),
    txHash: v.optional(v.string())
  },
  handler: async (ctx, { groupId, memberAddress, txHash }) => {
    const member = await requireUserByWallet(ctx, memberAddress)
    const group = await ctx.db.get(groupId)

    if (!group) {
      throw new Error('Group not found.')
    }

    if (group.ownerId === member._id) {
      return { status: 'owner' as const }
    }

    const existing = await ctx.db
      .query('userGroups')
      .withIndex('by_userId', q => q.eq('userId', member._id))
      .filter(q => q.eq(q.field('groupId'), groupId))
      .first()

    if (existing) {
      return { status: 'already_member' as const }
    }

    if ((group.price ?? 0) > 0 && !txHash) {
      throw new Error('Payment is required before joining this group.')
    }

    await ctx.db.insert('userGroups', {
      userId: member._id,
      groupId
    })

    await ctx.db.patch(groupId, {
      memberNumber: (group.memberNumber ?? 0) + 1
    })

    return { status: 'joined' as const }
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
