export type Platform =
  'telegram' | 'slack' | 'teams' | 'discord' | 'gchat' | 'whatsapp' | 'messenger'

export const PLATFORMS: Platform[] = [
  'telegram',
  'slack',
  'teams',
  'discord',
  'gchat',
  'whatsapp',
  'messenger',
]

export interface PlatformField {
  key: string
  label: string
  type: 'text' | 'password' | 'textarea'
  placeholder?: string
}

export const PLATFORM_FIELDS: Record<Platform, PlatformField[]> = {
  telegram: [{ key: 'bot_token', label: 'Bot Token', type: 'password' }],
  slack: [
    { key: 'bot_token', label: 'Bot Token', type: 'password' },
    { key: 'signing_secret', label: 'Signing Secret', type: 'password' },
    { key: 'app_token', label: 'App Token (socket mode)', type: 'password' },
  ],
  teams: [
    { key: 'app_id', label: 'App ID', type: 'text' },
    { key: 'app_password', label: 'App Password', type: 'password' },
    { key: 'app_tenant_id', label: 'Tenant ID', type: 'text' },
  ],
  discord: [
    { key: 'bot_token', label: 'Bot Token', type: 'password' },
    { key: 'public_key', label: 'Public Key', type: 'text' },
    { key: 'application_id', label: 'Application ID', type: 'text' },
  ],
  gchat: [
    { key: 'service_account_json', label: 'Service Account JSON', type: 'textarea' },
    { key: 'google_chat_project_number', label: 'Project Number', type: 'text' },
    { key: 'pubsub_topic', label: 'Pub/Sub Topic', type: 'text' },
    { key: 'pubsub_audience', label: 'Pub/Sub Audience', type: 'text' },
    { key: 'impersonate_user', label: 'Impersonate User', type: 'text' },
  ],
  whatsapp: [
    { key: 'access_token', label: 'Access Token', type: 'password' },
    { key: 'app_secret', label: 'App Secret', type: 'password' },
    { key: 'phone_number_id', label: 'Phone Number ID', type: 'text' },
    { key: 'verify_token', label: 'Verify Token', type: 'password' },
  ],
  messenger: [
    { key: 'page_access_token', label: 'Page Access Token', type: 'password' },
    { key: 'app_secret', label: 'App Secret', type: 'password' },
    { key: 'verify_token', label: 'Verify Token', type: 'password' },
  ],
}
