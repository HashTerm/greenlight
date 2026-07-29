/**
 * OpenAPI 3.0 document for Greenlight Agent + Admin APIs.
 * Served at GET /openapi.json when ENABLE_DOCS=true.
 * Also synced into docs-site/public/openapi.json.
 */
export function getOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Greenlight — Multi-Platform Prompt & Channel Gateway',
      version: '0.1.0',
      description:
        'Self-hosted HTTP gateway for human-in-the-loop AI agents across Telegram, Slack, Teams, Discord, Google Chat, WhatsApp, and Messenger.\n\n' +
        '**Path verbs:** `POST …/new` creates a durable resource (channel or prompt). `POST …/send` delivers chat text on a MESSAGE channel only.',
      license: {
        name: 'BUSL-1.1',
        url: 'https://spdx.org/licenses/BUSL-1.1.html',
      },
    },
    servers: [
      {
        url: 'http://localhost:8100',
        description: 'Local development',
      },
      {
        url: 'https://{host}',
        description: 'Self-hosted production (PUBLIC_WEBHOOK_URL origin)',
        variables: {
          host: {
            default: 'api.example.com',
            description: 'Your Greenlight host (no scheme)',
          },
        },
      },
    ],
    tags: [
      { name: 'Health' },
      { name: 'Prompts' },
      { name: 'Channels' },
      { name: 'Messages' },
      { name: 'Webhooks' },
      { name: 'Status' },
      { name: 'Settings' },
      { name: 'API keys' },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description:
            'Database-backed API key with scoped permissions. Bootstrap from API_KEY env on first boot when api_keys is empty.',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['detail'],
          properties: {
            detail: { type: 'string' },
          },
        },
        Platform: {
          type: 'string',
          enum: ['telegram', 'slack', 'teams', 'discord', 'gchat', 'whatsapp', 'messenger'],
        },
        ChannelType: {
          type: 'string',
          enum: ['MESSAGE', 'PROMPT'],
          default: 'MESSAGE',
        },
        CreatePromptRequest: {
          type: 'object',
          required: ['text'],
          properties: {
            channel_id: {
              type: 'string',
              nullable: true,
              description: 'Target PROMPT channel. Optional if DEFAULT_PROMPT_CHANNEL_ID is set.',
            },
            text: { type: 'string', maxLength: 4096 },
            options: {
              type: 'array',
              items: { type: 'string', maxLength: 64 },
              maxItems: 10,
              nullable: true,
              description: 'Button labels. Max 3 on WhatsApp/Messenger.',
            },
            allow_text: {
              type: 'boolean',
              default: false,
              description: 'Allow free-text replies matching ID:#N patterns.',
            },
            callback_url: {
              type: 'string',
              nullable: true,
              description: 'HTTPS URL for signed answer callbacks.',
            },
            correlation_id: {
              type: 'string',
              maxLength: 255,
              nullable: true,
            },
            ttl_sec: {
              type: 'integer',
              minimum: 0,
              maximum: 604800,
              nullable: true,
              description: 'Default 3600.',
            },
            media_url: { type: 'string', nullable: true },
            media_path: {
              type: 'string',
              nullable: true,
              description: 'Path under MEDIA_ALLOWED_DIR.',
            },
          },
        },
        CreatePromptResponse: {
          type: 'object',
          required: ['prompt_id', 'channel_id', 'message_id'],
          properties: {
            prompt_id: {
              type: 'string',
              example: '#123',
              description: 'Prompt id including leading #.',
            },
            channel_id: { type: 'string' },
            message_id: {
              oneOf: [{ type: 'string' }, { type: 'integer' }],
              description: 'Platform message identifier.',
            },
          },
        },
        Prompt: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '#123' },
            prompt_num: { type: 'integer' },
            chat_id: { type: 'string' },
            text: { type: 'string' },
            media_url: { type: 'string', nullable: true },
            options: {
              type: 'array',
              items: { type: 'string' },
            },
            allow_text: { type: 'boolean' },
            callback_url: { type: 'string', nullable: true },
            correlation_id: { type: 'string', nullable: true },
            state: {
              type: 'string',
              enum: ['pending', 'answered', 'expired'],
            },
            created_at: { type: 'string', format: 'date-time' },
            expires_at: { type: 'string', format: 'date-time', nullable: true },
            answered_at: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            answered_by_id: { type: 'string', nullable: true },
            answered_by_username: { type: 'string', nullable: true },
            answer: { type: 'string', nullable: true },
          },
        },
        CreateChannelRequest: {
          type: 'object',
          required: ['channel_id', 'platform', 'target_chat_id', 'credentials'],
          properties: {
            channel_id: { type: 'string', minLength: 1 },
            platform: { $ref: '#/components/schemas/Platform' },
            target_chat_id: { type: 'string', minLength: 1 },
            credentials: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Platform-specific credential map (bot_token, signing_secret, etc.).',
            },
            callback_url: {
              type: 'string',
              nullable: true,
              description: 'Required when channel_type is MESSAGE.',
            },
            channel_type: { $ref: '#/components/schemas/ChannelType' },
          },
        },
        UpdateChannelRequest: {
          type: 'object',
          properties: {
            target_chat_id: { type: 'string', minLength: 1 },
            callback_url: { type: 'string', nullable: true },
            credentials: {
              type: 'object',
              additionalProperties: { type: 'string' },
              description: 'Partial credentials patch; omitted keys are unchanged.',
            },
          },
        },
        ChannelResponse: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string' },
          },
        },
        SendMessageRequest: {
          type: 'object',
          required: ['channel_id', 'text'],
          properties: {
            channel_id: { type: 'string', minLength: 1 },
            text: { type: 'string', minLength: 1 },
          },
        },
        Channel: {
          type: 'object',
          properties: {
            channel_id: { type: 'string' },
            platform: { $ref: '#/components/schemas/Platform' },
            target_chat_id: { type: 'string' },
            channel_type: { $ref: '#/components/schemas/ChannelType' },
            is_active: { type: 'boolean' },
            callback_url: { type: 'string', nullable: true },
          },
        },
        AdminStatus: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'error'] },
            database: { type: 'string' },
            channels_active: { type: 'integer' },
            prompts_pending: { type: 'integer' },
            prompts_answered_24h: { type: 'integer' },
            platforms: {
              type: 'object',
              additionalProperties: { type: 'integer' },
            },
          },
        },
        MessageCreatedEvent: {
          type: 'object',
          description: 'Unsigned MESSAGE channel callback payload.',
          properties: {
            type: { type: 'string', enum: ['message.created'] },
            platform: { $ref: '#/components/schemas/Platform' },
            channel_id: { type: 'string' },
            from: { type: 'string' },
            text: { type: 'string' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            channel_id: { type: 'string' },
            direction: { type: 'string', enum: ['inbound', 'outbound'] },
            text: { type: 'string' },
            platform: { $ref: '#/components/schemas/Platform' },
            from_user: { type: 'string', nullable: true },
            api_key_id: { type: 'string', nullable: true, description: 'Outbound API key id' },
            platform_message_id: { type: 'string', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        ApiKey: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            key_prefix: { type: 'string' },
            scopes: { type: 'array', items: { type: 'string' } },
            created_at: { type: 'string', format: 'date-time' },
            revoked_at: { type: 'string', format: 'date-time', nullable: true },
            last_used_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
        CreateApiKeyRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', maxLength: 128 },
            preset: { type: 'string', enum: ['admin', 'agent', 'readonly'] },
            scopes: { type: 'array', items: { type: 'string' } },
          },
        },
        CreatedApiKey: {
          allOf: [
            { $ref: '#/components/schemas/ApiKey' },
            {
              type: 'object',
              required: ['key'],
              properties: {
                key: {
                  type: 'string',
                  description: 'Plaintext key — shown once at creation',
                },
              },
            },
          ],
        },
        RetentionSettings: {
          type: 'object',
          properties: {
            prompts_retention_enabled: { type: 'boolean' },
            prompts_retention_days: { type: 'integer', minimum: 1, maximum: 3650 },
            messages_inbound_retention_enabled: { type: 'boolean' },
            messages_outbound_retention_enabled: { type: 'boolean' },
            messages_inbound_retention_days: { type: 'integer', minimum: 1, maximum: 3650 },
            messages_outbound_retention_days: { type: 'integer', minimum: 1, maximum: 3650 },
            messages_inbound_zero_retention: { type: 'boolean' },
            messages_outbound_zero_retention: { type: 'boolean' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    paths: {
      '/healthz': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          security: [],
          responses: {
            '200': {
              description: 'Service is up',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/v1/prompts/new': {
        post: {
          tags: ['Prompts'],
          summary: 'Create a prompt',
          description:
            'Creates a durable prompt resource and posts it to the PROMPT channel. Accepts `application/json` or `multipart/form-data` (for file upload). Use `/send` only for MESSAGE channel chat text.',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreatePromptRequest' },
              },
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['text'],
                  properties: {
                    text: { type: 'string' },
                    channel_id: { type: 'string' },
                    options: {
                      type: 'string',
                      description: 'JSON array of option strings',
                    },
                    allow_text: { type: 'string' },
                    callback_url: { type: 'string' },
                    correlation_id: { type: 'string' },
                    ttl_sec: { type: 'string' },
                    media_url: { type: 'string' },
                    media_path: { type: 'string' },
                    file: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Prompt created',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/CreatePromptResponse',
                  },
                },
              },
            },
            '400': {
              description: 'Validation or business error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '401': {
              description: 'Missing or invalid API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '415': {
              description: 'Unsupported Content-Type',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/prompts': {
        get: {
          tags: ['Prompts'],
          summary: 'List prompts',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'state',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['pending', 'answered', 'expired', 'all'],
                default: 'pending',
              },
            },
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 200,
                default: 50,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Prompt list',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Prompt' },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/prompts/{id}': {
        get: {
          tags: ['Prompts'],
          summary: 'Get prompt by id',
          description: 'Encode `#` as `%23` (e.g. `%23123` for `#123`).',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', example: '%23123' },
            },
          ],
          responses: {
            '200': {
              description: 'Prompt found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Prompt' },
                },
              },
            },
            '404': {
              description: 'Not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/channels': {
        get: {
          tags: ['Channels'],
          summary: 'List channels',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'platform',
              in: 'query',
              schema: { $ref: '#/components/schemas/Platform' },
            },
            {
              name: 'channel_type',
              in: 'query',
              schema: { type: 'string', enum: ['MESSAGE', 'PROMPT'] },
            },
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 200,
                default: 50,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Channels',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Channel' },
                  },
                },
              },
            },
          },
        },
      },
      '/v1/channels/new': {
        post: {
          tags: ['Channels'],
          summary: 'Create a channel',
          description:
            'Registers a durable channel resource. Use `/send` only for MESSAGE channel chat text.',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateChannelRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Channel created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ChannelResponse' },
                },
              },
            },
            '400': {
              description: 'Validation error or missing MESSAGE callback_url',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '409': {
              description: 'Channel already exists',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/channels/{id}': {
        patch: {
          tags: ['Channels'],
          summary: 'Update a channel',
          description:
            'Updates mutable fields and reactivates deactivated channels. platform and channel_type cannot be changed.',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Channel id (the `channel_id` slug registered at creation)',
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateChannelRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Channel updated',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ChannelResponse' },
                },
              },
            },
            '404': {
              description: 'Channel not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        delete: {
          tags: ['Channels'],
          summary: 'Unregister channel',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Channel id (the `channel_id` slug registered at creation)',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Unregistered',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ChannelResponse' },
                },
              },
            },
            '404': {
              description: 'Not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/messages': {
        get: {
          tags: ['Messages'],
          summary: 'List message history',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'direction',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['inbound', 'outbound', 'all'],
                default: 'all',
              },
            },
            {
              name: 'channel_id',
              in: 'query',
              schema: { type: 'string' },
            },
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 200,
                default: 50,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Message history',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Message' },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/messages/send': {
        post: {
          tags: ['Messages'],
          summary: 'Send chat text on a MESSAGE channel',
          description:
            'Delivers plain text in an existing MESSAGE channel thread. Use `/new` to create channels or prompts.',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SendMessageRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Sent',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'sent' },
                      message_id: { type: 'string', format: 'uuid' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Not a MESSAGE channel or send error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '404': {
              description: 'Channel not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/messages/{id}': {
        get: {
          tags: ['Messages'],
          summary: 'Get message by id',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Message record',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Message' },
                },
              },
            },
            '404': {
              description: 'Not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/webhooks/{platform}/{channel_id}': {
        get: {
          tags: ['Webhooks'],
          summary: 'Platform webhook verification (WhatsApp, Messenger)',
          security: [],
          parameters: [
            {
              name: 'platform',
              in: 'path',
              required: true,
              schema: { $ref: '#/components/schemas/Platform' },
            },
            {
              name: 'channel_id',
              in: 'path',
              required: true,
              description: 'Registered Greenlight channel slug',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'Verification challenge response' },
          },
        },
        post: {
          tags: ['Webhooks'],
          summary: 'Platform webhook handler',
          security: [],
          parameters: [
            {
              name: 'platform',
              in: 'path',
              required: true,
              schema: { $ref: '#/components/schemas/Platform' },
            },
            {
              name: 'channel_id',
              in: 'path',
              required: true,
              description: 'Registered Greenlight channel slug',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': { description: 'Event accepted' },
          },
        },
      },
      '/v1/status': {
        get: {
          tags: ['Status'],
          summary: 'Deep health / operator status',
          description: 'Requires `status:read` scope (or `admin`).',
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Status payload',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/AdminStatus' },
                },
              },
            },
            '401': {
              description: 'Invalid API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '403': {
              description: 'Missing required scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/settings': {
        get: {
          tags: ['Settings'],
          summary: 'Get data retention settings',
          description: 'Requires `settings:read` scope (or `admin`).',
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'Retention settings',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RetentionSettings' },
                },
              },
            },
            '401': {
              description: 'Invalid API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '403': {
              description: 'Missing required scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        patch: {
          tags: ['Settings'],
          summary: 'Update data retention settings',
          description: 'Requires `settings:write` scope (or `admin`).',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RetentionSettings' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Updated settings',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RetentionSettings' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '401': {
              description: 'Invalid API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '403': {
              description: 'Missing required scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/keys': {
        get: {
          tags: ['API keys'],
          summary: 'List API keys',
          description: 'Requires `keys:read` scope (or `admin`).',
          security: [{ ApiKeyAuth: [] }],
          responses: {
            '200': {
              description: 'API keys (no plaintext)',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ApiKey' },
                  },
                },
              },
            },
            '401': {
              description: 'Invalid API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '403': {
              description: 'Missing required scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/keys/new': {
        post: {
          tags: ['API keys'],
          summary: 'Create API key',
          description: 'Requires `keys:write` scope (or `admin`). Returns plaintext key once.',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateApiKeyRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Created key with plaintext',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/CreatedApiKey' },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '401': {
              description: 'Invalid API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '403': {
              description: 'Missing required scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/v1/keys/{id}': {
        get: {
          tags: ['API keys'],
          summary: 'Get API key by id',
          description: 'Requires `keys:read` scope (or `admin`).',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'API key metadata',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiKey' },
                },
              },
            },
            '404': {
              description: 'Not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '401': {
              description: 'Invalid API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '403': {
              description: 'Missing required scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        delete: {
          tags: ['API keys'],
          summary: 'Revoke API key',
          description:
            'Requires `keys:write` scope (or `admin`). Cannot revoke the last key with key-management access.',
          security: [{ ApiKeyAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Key revoked',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { status: { type: 'string', enum: ['revoked'] } },
                  },
                },
              },
            },
            '400': {
              description: 'Cannot revoke last manager key or self',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '404': {
              description: 'Not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '401': {
              description: 'Invalid API key',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '403': {
              description: 'Missing required scope',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
    },
  }
}
