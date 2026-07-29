export type EnterpriseFeature = 'audit' | 'sso' | 'multi_user_admin' | 'rbac'

export interface LicenseGate {
  isEnabled(feature: EnterpriseFeature): boolean
}

export const licenseGate: LicenseGate = {
  isEnabled(_feature: EnterpriseFeature): boolean {
    return false
  },
}
