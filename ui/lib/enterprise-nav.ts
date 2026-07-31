import { registerEnterpriseNav } from '@/lib/extensions/register'

export async function getEnterpriseNavLinks() {
  return registerEnterpriseNav()
}
