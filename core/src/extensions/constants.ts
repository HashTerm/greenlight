export const DEFAULT_ORG_ID = 'default'

export const MEMBER_ROLES = ['admin', 'operator', 'viewer', 'member'] as const
export type MemberRole = (typeof MEMBER_ROLES)[number]

export const MEMBER_STATUSES = ['invited', 'active', 'disabled'] as const
export type MemberStatus = (typeof MEMBER_STATUSES)[number]
