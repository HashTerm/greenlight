/** Default organization for single-tenant self-host deployments. */
export const DEFAULT_ORG_ID = 'default'

export type OrgScope = {
  organizationId: string
}

export function channelRegistryKey(organizationId: string, channelId: string): string {
  return `${organizationId}:${channelId}`
}
