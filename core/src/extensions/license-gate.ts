export type EnterpriseFeature =
  | 'broadcast_groups'
  | 'audit_log'
  | 'multi_user_admin'
  | 'role_based_access'
  | 'single_sign_on'

export interface LicenseGate {
  isEnabled(feature: EnterpriseFeature): boolean
}

export const licenseGate: LicenseGate = {
  isEnabled(_feature: EnterpriseFeature): boolean {
    return false
  },
}
