/**
 * OpenAPI description of every endpoint this server exposes. /docs renders it
 * with Swagger UI and the status page at / lists it, so update it whenever a
 * route is added or its request/response shape changes.
 */

export type HttpMethod = 'get' | 'post'

/** Browser-tab icon for the API's HTML pages: "TT" on the brand blue. */
export const FAVICON_LINK = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#3f51b5"/><text x="16" y="21" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">TT</text></svg>',
)}">`

export type ApiOperation = {
  operationId: string
  tags: [string]
  summary: string
  description?: string
  security?: Record<string, string[]>[]
  parameters?: Record<string, unknown>[]
  requestBody?: Record<string, unknown>
  responses: Record<string, Record<string, unknown>>
}

type OpenApiDocument = {
  openapi: string
  info: { title: string; version: string; description: string }
  tags: { name: string; description: string }[]
  paths: Record<string, Partial<Record<HttpMethod, ApiOperation>>>
  components: Record<string, Record<string, unknown>>
}

const IDENTIFIER = {
  type: 'string',
  pattern: '^[A-Za-z0-9_-]{1,64}$',
} as const

function json(schema: Record<string, unknown>, description: string) {
  return { description, content: { 'application/json': { schema } } }
}

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` }
}

function response(name: string) {
  return { $ref: `#/components/responses/${name}` }
}

function body(schemaName: string) {
  return {
    required: true,
    content: { 'application/json': { schema: ref(schemaName) } },
  }
}

const error = (description: string) => json(ref('Error'), description)

export const openApiDocument: OpenApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Tech Talk Hub API',
    version: '1.0.0',
    description: [
      'Backend for the Tech Talk Hub website and dashboards.',
      '',
      'Requests and responses are JSON unless noted. Failures return `{ "error": "message" }` with a message that can be shown to the user.',
      'Rate-limited endpoints answer `429` with a `Retry-After` header (seconds).',
      '',
      'Endpoints marked with a lock need `Authorization: Bearer <token>`. Use **Authorize** above to set it for "Try it out".',
    ].join('\n'),
  },
  tags: [
    { name: 'Classroom', description: 'Live classes on LiveKit.' },
    { name: 'Admin', description: 'Account management for admins.' },
    { name: 'Payments', description: 'Receipts and receipt verification.' },
    { name: 'Leads', description: 'Website lead capture.' },
    { name: 'Notifications', description: 'Web push to tutors.' },
    { name: 'Scheduler', description: 'Jobs run by a cron scheduler.' },
  ],
  paths: {
    '/api/classroom/token': {
      post: {
        operationId: 'classroomToken',
        tags: ['Classroom'],
        summary: 'Get a token to join a class',
        description: [
          'Checks that the class exists and is open, creates the LiveKit room if needed (25 people max), and returns a token valid for 2 hours.',
          '',
          'Anyone with the class link can join as a participant, signed in or not. Joining as `host` needs the class’s tutor or an admin signed in.',
          '',
          'Rate limit: 30 requests per minute per IP.',
        ].join('\n'),
        security: [{ supabaseAuth: [] }, {}],
        requestBody: body('ClassroomTokenRequest'),
        responses: {
          '200': json(ref('ClassroomTokenResponse'), 'Token issued.'),
          '400': error('roomId, identity or name is missing or invalid.'),
          '403': json(
            ref('ClassroomError'),
            'The class hasn’t opened yet (`opensAt` says when), or the caller asked to host without being allowed to.',
          ),
          '404': error('No class uses this class ID.'),
          '409': error('The LiveKit room exists with a different capacity.'),
          '410': error(
            'The class has ended, was cancelled, or its link expired.',
          ),
          '429': response('TooManyRequests'),
          '503': error(
            'LiveKit or the classroom tables aren’t set up on the server.',
          ),
        },
      },
    },
    '/api/classroom/end': {
      post: {
        operationId: 'classroomEnd',
        tags: ['Classroom'],
        summary: 'End a class for everyone',
        description:
          'Deletes the LiveKit room, which disconnects every participant. Only the class’s tutor or an admin can do this.\n\nRate limit: 10 requests per minute per IP.',
        security: [{ supabaseAuth: [] }],
        requestBody: body('ClassroomEndRequest'),
        responses: {
          '200': json(
            {
              type: 'object',
              required: ['ended'],
              properties: { ended: { type: 'boolean', example: true } },
            },
            'The room is closed (or was already gone).',
          ),
          '400': error('roomId is missing or invalid.'),
          '401': error('Not signed in.'),
          '403': error('Signed in, but not this class’s tutor or an admin.'),
          '404': error('No class uses this class ID.'),
          '429': response('TooManyRequests'),
          '503': error(
            'LiveKit or the classroom tables aren’t set up on the server.',
          ),
        },
      },
    },
    '/api/admin/users': {
      post: {
        operationId: 'createUser',
        tags: ['Admin'],
        summary: 'Create a user account',
        description: [
          'Creates a confirmed account with a one-time temporary password, which is returned once and never stored. The new person signs in with it, then changes it.',
          '',
          'The caller must be an `owner`, `operations_admin` or `tech_admin`. Only an owner can create another owner.',
          '',
          'Rate limit: 30 requests per minute per IP.',
        ].join('\n'),
        security: [{ supabaseAuth: [] }],
        requestBody: body('CreateUserRequest'),
        responses: {
          '201': json(ref('CreateUserResponse'), 'Account created.'),
          '400': error(
            'Invalid email, missing name, unknown role, or a meet link that isn’t https.',
          ),
          '401': error('Not signed in, or the session expired.'),
          '403': error(
            'The caller isn’t an admin, or a non-owner tried to add an owner.',
          ),
          '409': error('Someone already has an account with this email.'),
          '429': response('TooManyRequests'),
          '500': error('Supabase refused to create the account or profile.'),
        },
      },
    },
    '/api/send-receipt/api/receipts': {
      post: {
        operationId: 'sendReceipt',
        tags: ['Payments'],
        summary: 'Email a payment receipt',
        description:
          'Emails the parent a receipt with a QR code that opens the receipt verification page.',
        requestBody: body('ReceiptRequest'),
        responses: {
          '200': json(
            {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  description: 'The email provider’s response.',
                },
              },
            },
            'Email handed to the provider.',
          ),
          '500': json(
            {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: { type: 'string', example: 'Internal Server Error' },
              },
            },
            'The email could not be sent.',
          ),
        },
      },
    },
    '/api/send-receipt/receipt/{receiptNumber}': {
      get: {
        operationId: 'verifyReceipt',
        tags: ['Payments'],
        summary: 'Receipt verification page',
        description:
          'The page a receipt’s QR code opens. Returns HTML, not JSON.',
        parameters: [
          {
            name: 'receiptNumber',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'TTH-2026-0001',
          },
        ],
        responses: {
          '200': {
            description: 'The receipt, marked as verified.',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
          '404': {
            description: 'No receipt has this number.',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
          '500': {
            description: 'The receipt lookup failed.',
            content: { 'text/plain': { schema: { type: 'string' } } },
          },
        },
      },
    },
    '/api/send-curriculum': {
      post: {
        operationId: 'sendCurriculum',
        tags: ['Leads'],
        summary: 'Email the curriculum roadmap',
        description:
          'Emails the roadmap PDF link to a parent and, when a lead inbox is configured, tells the team about the new lead.\n\nRate limit: 5 requests per 15 minutes per IP.',
        requestBody: body('CurriculumRequest'),
        responses: {
          '200': json(ref('Success'), 'Roadmap sent.'),
          '400': error('Invalid email address.'),
          '429': response('TooManyRequests'),
          '502': error('The email provider rejected the message.'),
          '503': error('Roadmap emails aren’t configured on the server.'),
        },
      },
    },
    '/api/push': {
      post: {
        operationId: 'sendPush',
        tags: ['Notifications'],
        summary: 'Send a push notification to a tutor',
        description:
          'Sends a web push to the tutor’s saved subscription. Clicking it opens `/calendar`.',
        requestBody: body('PushRequest'),
        responses: {
          '200': json(ref('Success'), 'Notification sent.'),
          '404': error('The tutor has no push subscription.'),
          '500': error('The push service rejected the notification.'),
        },
      },
    },
    '/api/cron/reminders': {
      get: {
        operationId: 'runReminders',
        tags: ['Scheduler'],
        summary: 'Send class reminder texts',
        description:
          'Texts parents about classes starting in 10 minutes. A scheduler calls this every minute; Vercel Cron uses GET, others can POST.',
        security: [{ cronSecret: [] }],
        responses: {
          '200': json(
            {
              type: 'object',
              properties: { ok: { type: 'boolean', example: true } },
            },
            'Reminders sent.',
          ),
          '401': error('Missing or wrong cron secret.'),
          '500': error('The reminder run failed.'),
          '503': error('No cron secret is configured on the server.'),
        },
      },
      post: {
        operationId: 'runRemindersPost',
        tags: ['Scheduler'],
        summary: 'Send class reminder texts (POST)',
        description: 'Same as the GET form, for schedulers that only POST.',
        security: [{ cronSecret: [] }],
        responses: {
          '200': json(
            {
              type: 'object',
              properties: { ok: { type: 'boolean', example: true } },
            },
            'Reminders sent.',
          ),
          '401': error('Missing or wrong cron secret.'),
          '500': error('The reminder run failed.'),
          '503': error('No cron secret is configured on the server.'),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      supabaseAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'The signed-in user’s Supabase access token (`session.access_token`).',
      },
      cronSecret: {
        type: 'http',
        scheme: 'bearer',
        description: 'The cron secret configured on the server.',
      },
    },
    responses: {
      TooManyRequests: {
        description: 'Rate limit reached. Try again after `Retry-After`.',
        headers: {
          'Retry-After': {
            description: 'Seconds until the limit resets.',
            schema: { type: 'integer' },
          },
        },
        content: { 'application/json': { schema: ref('Error') } },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Enter a valid email address.' },
        },
      },
      Success: {
        type: 'object',
        required: ['success'],
        properties: { success: { type: 'boolean', example: true } },
      },
      ClassroomError: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          opensAt: {
            type: 'string',
            format: 'date-time',
            description: 'When the class opens, if it hasn’t yet.',
          },
        },
      },
      ClassroomTokenRequest: {
        type: 'object',
        required: ['roomId', 'identity', 'name'],
        properties: {
          roomId: { ...IDENTIFIER, example: 'math-101-a' },
          identity: {
            ...IDENTIFIER,
            description: 'Unique per participant.',
            example: 'student_42',
          },
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 80,
            description: 'Display name in the call.',
            example: 'Amina W.',
          },
          role: {
            type: 'string',
            enum: ['participant', 'host'],
            default: 'participant',
            description:
              'What to join as. `host` is refused unless the caller may host.',
          },
        },
      },
      ClassroomTokenResponse: {
        type: 'object',
        required: ['serverUrl', 'token', 'role'],
        properties: {
          serverUrl: {
            type: 'string',
            example: 'wss://example.livekit.cloud',
          },
          token: { type: 'string', description: 'LiveKit access token.' },
          role: { type: 'string', enum: ['participant', 'host'] },
        },
      },
      ClassroomEndRequest: {
        type: 'object',
        required: ['roomId'],
        properties: { roomId: { ...IDENTIFIER, example: 'math-101-a' } },
      },
      CreateUserRequest: {
        type: 'object',
        required: ['email', 'fullName', 'role'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 254,
            example: 'parent@example.com',
          },
          fullName: {
            type: 'string',
            maxLength: 120,
            example: 'Amina Wanjiku',
          },
          role: {
            type: 'string',
            enum: [
              'student',
              'tutor',
              'marketer',
              'operations_admin',
              'tech_admin',
              'owner',
            ],
          },
          meetLink: {
            type: 'string',
            format: 'uri',
            description: 'Tutors only. Must be https.',
            example: 'https://meet.google.com/abc-defg-hij',
          },
          subscriptionTier: {
            type: 'string',
            maxLength: 60,
            default: 'Starter',
            description: 'Students only.',
          },
          totalClasses: {
            type: 'integer',
            minimum: 0,
            maximum: 1000,
            description: 'Students only.',
            example: 8,
          },
          classesRemaining: {
            type: 'integer',
            minimum: 0,
            maximum: 1000,
            description: 'Students only.',
            example: 8,
          },
        },
      },
      CreateUserResponse: {
        type: 'object',
        required: ['id', 'email', 'role', 'temporaryPassword'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string' },
          temporaryPassword: {
            type: 'string',
            description: 'Shown once. Give it to the person to sign in with.',
            example: 'Hk7q-Xm2P-wd9R-42',
          },
        },
      },
      ReceiptRequest: {
        type: 'object',
        required: [
          'studentName',
          'parentEmail',
          'planName',
          'billingCycle',
          'currency',
          'amountPaid',
          'gatewayMethod',
          'transactionId',
          'receiptNumber',
        ],
        properties: {
          studentName: { type: 'string', example: 'Amina Wanjiku' },
          parentEmail: {
            type: 'string',
            format: 'email',
            example: 'parent@example.com',
          },
          planName: { type: 'string', example: 'Junior Coders' },
          billingCycle: { type: 'string', example: 'Monthly' },
          currency: { type: 'string', example: 'KES' },
          amountPaid: {
            oneOf: [{ type: 'number' }, { type: 'string' }],
            example: 4500,
          },
          gatewayMethod: { type: 'string', example: 'M-Pesa' },
          transactionId: { type: 'string', example: 'SKL3H7XQ2P' },
          receiptNumber: { type: 'string', example: 'TTH-2026-0001' },
        },
      },
      CurriculumRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 254,
            example: 'parent@example.com',
          },
        },
      },
      PushRequest: {
        type: 'object',
        required: ['tutor_id', 'title', 'body'],
        properties: {
          tutor_id: { type: 'string', format: 'uuid' },
          title: { type: 'string', example: 'New class booked' },
          body: { type: 'string', example: 'Tomorrow at 4:00 PM' },
        },
      },
    },
  },
}

/** Each endpoint once per method, in document order, for listings. */
export function apiOperations() {
  return Object.entries(openApiDocument.paths).flatMap(([path, item]) =>
    (['get', 'post'] as const).flatMap((method) => {
      const operation = item[method]
      return operation ? [{ path, method, operation }] : []
    }),
  )
}
