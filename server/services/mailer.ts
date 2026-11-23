import { createTransport } from 'nodemailer'

/**
 * Outgoing email over SMTP (nodemailer). Works with any provider: Gmail /
 * Google Workspace (an app password), Zoho, Brevo, Mailgun, SES SMTP...
 *
 * Server environment (server/.env locally, the server project's env on Vercel):
 *   SMTP_HOST      e.g. smtp.gmail.com
 *   SMTP_PORT      587 (STARTTLS, the default) or 465 (TLS)
 *   SMTP_SECURE    optional; "true" for port 465. Defaults to true on 465.
 *   SMTP_USER      the mailbox / SMTP username
 *   SMTP_PASS      its password or app password
 *   MAIL_FROM      optional; e.g. "Tech Talk Hub <classes@techtalk-hub.com>".
 *                  Defaults to SMTP_USER.
 *   MAIL_REPLY_TO  optional; where parents' replies go.
 *
 * Nothing here runs at import, so the server still starts without these;
 * sending then fails with a MailerConfigError naming what's missing.
 */

export class MailerConfigError extends Error {}

type MailerConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
  replyTo: string | undefined
}

const env = (name: string) => process.env[name]?.trim() || undefined

function readConfig(): MailerConfig {
  const host = env('SMTP_HOST')
  const user = env('SMTP_USER')
  const pass = env('SMTP_PASS')
  const missing = [
    !host && 'SMTP_HOST',
    !user && 'SMTP_USER',
    !pass && 'SMTP_PASS',
  ].filter((name): name is string => Boolean(name))
  if (!host || !user || !pass) {
    throw new MailerConfigError(
      `Email isn’t set up: add ${missing.join(', ')} to the server environment.`,
    )
  }
  const port = Number(env('SMTP_PORT') ?? 587)
  if (!Number.isInteger(port) || port <= 0) {
    throw new MailerConfigError('SMTP_PORT must be a port number, e.g. 587.')
  }
  const secureSetting = env('SMTP_SECURE')
  return {
    host,
    port,
    secure: secureSetting ? secureSetting === 'true' : port === 465,
    user,
    // Gmail shows app passwords in groups ("abcd efgh ..."); SMTP wants them
    // without the spaces.
    pass: /^[a-z]{4}( [a-z]{4}){3}$/i.test(pass)
      ? pass.replace(/ /g, '')
      : pass,
    from: senderFor(env('MAIL_FROM'), user),
    replyTo: env('MAIL_REPLY_TO'),
  }
}

/**
 * "Tech Talk Hub <classes@x.com>" is used as is; a bare name such as
 * "Tech Talk Hub" is sent from the SMTP mailbox, since a From without an
 * address would be rejected or rewritten.
 */
function senderFor(setting: string | undefined, user: string): string {
  const fallback = `Tech Talk Hub <${user}>`
  if (!setting) return fallback
  if (setting.includes('@')) return setting
  const name = setting.replace(/["<>]/g, '').trim()
  return name ? `${name} <${user}>` : fallback
}

/** Whether email can be sent, without throwing. */
export function mailerReady():
  { ready: true } | { ready: false; reason: string } {
  try {
    readConfig()
    return { ready: true }
  } catch (error) {
    return {
      ready: false,
      reason: error instanceof Error ? error.message : 'Email isn’t set up.',
    }
  }
}

let cached: {
  key: string
  transport: ReturnType<typeof createTransport>
} | null = null

function transportFor(config: MailerConfig) {
  // Rebuilt if the settings change (e.g. keys swapped while running).
  const key = [
    config.host,
    config.port,
    config.secure,
    config.user,
    config.pass,
  ].join('|')
  if (cached?.key !== key) {
    cached = {
      key,
      transport: createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.pass },
        // Fail fast on a wrong host or port instead of hanging a request.
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
      }),
    }
  }
  return cached.transport
}

export type OutgoingEmail = {
  to: string
  subject: string
  html: string
  text: string
  /** An .ics invite, shown by mail apps as "Add to calendar". */
  calendar?: { filename: string; content: string }
}

/** Sends one email; throws MailerConfigError or the SMTP error. */
export async function sendEmail(
  email: OutgoingEmail,
): Promise<{ messageId: string }> {
  const config = readConfig()
  const info = await transportFor(config).sendMail({
    from: config.from,
    replyTo: config.replyTo,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    icalEvent: email.calendar
      ? {
          method: 'PUBLISH',
          filename: email.calendar.filename,
          content: email.calendar.content,
        }
      : undefined,
  })
  return { messageId: String(info.messageId ?? '') }
}
