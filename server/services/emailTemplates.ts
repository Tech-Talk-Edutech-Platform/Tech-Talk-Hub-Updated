/**
 * HTML emails. Table layout with inline styles, because that's what mail apps
 * (Gmail, Outlook, Apple Mail) render reliably. Every value from the database
 * goes through `esc()`.
 *
 * The design: the class itself is the hero. Date, time and the Join button
 * sit together on one solid brand-colour "ticket", so a parent who reads
 * nothing else still knows when it is and how to get in. Everything else
 * (who, what, how to get ready) follows in plain, readable type. No
 * gradients, shadows or hairline boxes: surfaces are separated by tone.
 *
 * Brand colours match the site (src/index.css): brand #3f51b5, ink #172554,
 * pink #db2777.
 */

const BRAND = '#3f51b5'
const BRAND_STRONG = '#303f9f'
/** Secondary text on the brand field: 5.6:1 against BRAND. */
const ON_BRAND_SOFT = '#e1e5f7'
const PINK = '#db2777'
const INK = '#172554'
/** Secondary text: 5.9:1 on white, 5.4:1 on PANEL. */
const MUTED = '#556079'
const PANEL = '#f2f4fb'
const CANVAS = '#eceff7'
const FONT =
  "'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export const SUPPORT = {
  whatsappDisplay: '+254 118 755 558',
  whatsappUrl: 'https://wa.me/254118755558',
}

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type RenderedEmail = { subject: string; html: string; text: string }

type Detail = { label: string; value: string }

type Layout = {
  /** Shown in the inbox next to the subject. */
  preheader: string
  heading: string
  /** Plain sentences; each becomes a paragraph. */
  intro: string[]
  /** The class on the brand-colour ticket. */
  ticket: {
    day: string
    hours: string
    /** One short line under the time, e.g. "Free trial · Coding & AI". */
    caption: string
    cta: { label: string; url: string }
    /** Under the button, e.g. when the room opens. */
    note: string
    /** "Add to Google Calendar"; the .ics attachment covers other apps. */
    calendarUrl: string
  }
  details: Detail[]
  steps: { title: string; items: string[] }
  footnote: string
}

/** A "Add to Google Calendar" link for the class. */
export function googleCalendarUrl(input: {
  title: string
  start: Date
  end: Date
  details: string
  location: string
}): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${icsStamp(input.start)}/${icsStamp(input.end)}`,
    details: input.details,
    location: input.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function renderDetails(details: Detail[]): string {
  return details
    .map(
      (detail, index) => `
              <tr>
                <td class="detail-label" style="padding:${index === 0 ? '18px' : '7px'} 0 ${index === details.length - 1 ? '18px' : '7px'} 22px;width:34%;font-family:${FONT};font-size:14px;line-height:22px;color:${MUTED};vertical-align:top;">${esc(detail.label)}</td>
                <td style="padding:${index === 0 ? '18px' : '7px'} 22px ${index === details.length - 1 ? '18px' : '7px'} 12px;font-family:${FONT};font-size:16px;line-height:22px;color:${INK};font-weight:700;vertical-align:top;">${esc(detail.value)}</td>
              </tr>`,
    )
    .join('')
}

function renderSteps(items: string[]): string {
  return items
    .map(
      (item) => `
              <tr>
                <td style="padding:9px 14px 0 0;width:8px;vertical-align:top;">
                  <div style="width:8px;height:8px;background:${PINK};border-radius:2px;font-size:0;line-height:0;">&nbsp;</div>
                </td>
                <td style="padding:0 0 12px;font-family:${FONT};font-size:16px;line-height:25px;color:${INK};vertical-align:top;">${esc(item)}</td>
              </tr>`,
    )
    .join('')
}

function renderLayout(layout: Layout): string {
  const { ticket } = layout
  const paragraphs = layout.intro
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:26px;color:${INK};">${esc(line)}</p>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(layout.heading)}</title>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; }
  a { text-decoration-thickness: 1px; text-underline-offset: 3px; }
  @media (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .ticket { padding: 26px 22px 24px !important; }
    .h1 { font-size: 27px !important; line-height: 33px !important; }
    .day { font-size: 24px !important; line-height: 30px !important; }
    .button { width: 100% !important; }
    .button a { display: block !important; text-align: center !important; }
    .detail-label { width: 40% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${CANVAS};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(layout.preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${CANVAS}" style="background:${CANVAS};">
    <tr>
      <td align="center" style="padding:28px 12px 36px;">
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td class="px" style="padding:0 40px 18px;font-family:${FONT};font-size:20px;line-height:26px;font-weight:800;color:${BRAND};letter-spacing:-0.3px;">
              Tech Talk Hub
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background:#ffffff;border-radius:22px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="px" style="padding:40px 40px 10px;">
                    <h1 class="h1" style="margin:0 0 18px;font-family:${FONT};font-size:30px;line-height:36px;font-weight:800;letter-spacing:-0.6px;color:${INK};">${esc(layout.heading)}</h1>
                    ${paragraphs}
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:10px 40px 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td class="ticket" bgcolor="${BRAND}" style="background:${BRAND};border-radius:18px;padding:30px 30px 26px;">
                          <p class="day" style="margin:0;font-family:${FONT};font-size:28px;line-height:34px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">${esc(ticket.day)}</p>
                          <p style="margin:6px 0 0;font-family:${FONT};font-size:18px;line-height:26px;font-weight:600;color:#ffffff;">${esc(ticket.hours)}</p>
                          <p style="margin:4px 0 0;font-family:${FONT};font-size:15px;line-height:22px;color:${ON_BRAND_SOFT};">${esc(ticket.caption)}</p>
                          <table role="presentation" class="button" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 0;">
                            <tr>
                              <td bgcolor="#ffffff" style="background:#ffffff;border-radius:999px;">
                                <a href="${esc(ticket.cta.url)}" style="display:inline-block;padding:16px 30px;font-family:${FONT};font-size:17px;line-height:22px;font-weight:800;color:${BRAND_STRONG};text-decoration:none;border-radius:999px;">${esc(ticket.cta.label)}&nbsp;&rarr;</a>
                              </td>
                            </tr>
                          </table>
                          <p style="margin:16px 0 0;font-family:${FONT};font-size:14px;line-height:21px;color:${ON_BRAND_SOFT};">${esc(ticket.note)}</p>
                          <p style="margin:10px 0 0;font-family:${FONT};font-size:14px;line-height:21px;">
                            <a href="${esc(ticket.calendarUrl)}" style="color:#ffffff;font-weight:700;text-decoration:underline;">Add to Google Calendar</a>
                            <span style="color:${ON_BRAND_SOFT};">&nbsp;&middot; or open the attached invite</span>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:18px 40px 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PANEL}" style="background:${PANEL};border-radius:16px;">
                      ${renderDetails(layout.details)}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:14px 40px 0;">
                    <p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">Button not working? Copy this link into your browser:<br><a href="${esc(ticket.cta.url)}" style="color:${BRAND};word-break:break-all;">${esc(ticket.cta.url)}</a></p>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:36px 40px 4px;">
                    <h2 style="margin:0 0 14px;font-family:${FONT};font-size:20px;line-height:26px;font-weight:800;letter-spacing:-0.3px;color:${INK};">${esc(layout.steps.title)}</h2>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${renderSteps(layout.steps.items)}</table>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:18px 40px 40px;">
                    <p style="margin:0;font-family:${FONT};font-size:16px;line-height:25px;color:${INK};">Questions, or need to change the time? Message us on WhatsApp at <a href="${SUPPORT.whatsappUrl}" style="color:${BRAND_STRONG};font-weight:800;text-decoration:none;white-space:nowrap;">${SUPPORT.whatsappDisplay}</a>, or just reply to this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:22px 40px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">
              ${esc(layout.footnote)}<br>
              &copy; ${new Date().getFullYear()} Tech Talk Hub &middot; Coding and AI classes for children
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function renderText(layout: Layout): string {
  const { ticket } = layout
  return [
    layout.heading,
    '',
    ...layout.intro,
    '',
    ticket.day,
    ticket.hours,
    ticket.caption,
    '',
    `${ticket.cta.label}: ${ticket.cta.url}`,
    ticket.note,
    `Add to Google Calendar: ${ticket.calendarUrl}`,
    '',
    ...layout.details.map((detail) => `${detail.label}: ${detail.value}`),
    '',
    layout.steps.title,
    ...layout.steps.items.map((item) => `- ${item}`),
    '',
    `Questions, or need to change the time? WhatsApp ${SUPPORT.whatsappDisplay} (${SUPPORT.whatsappUrl}), or reply to this email.`,
    '',
    layout.footnote,
  ].join('\n')
}

const NAIROBI = 'Africa/Nairobi'

/** The zone if Intl knows it, else Nairobi (where trials used to be booked). */
export function knownZone(zone: string | null | undefined): string {
  if (!zone) return NAIROBI
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(0)
    return zone
  } catch {
    return NAIROBI
  }
}

/** "East Africa Time" for Nairobi, else "Denver time". */
const zoneName = (zone: string) =>
  zone === NAIROBI
    ? 'East Africa Time'
    : `${(zone.split('/').pop() ?? zone).replace(/_/g, ' ')} time`

/**
 * e.g. "Saturday, 22 November 2026" and "4:00 PM – 5:00 PM (East Africa
 * Time)", in `zone` (the reader's own: the family's, or the tutor's).
 */
export function classTime(start: Date, end: Date, zone: string = NAIROBI) {
  const timeZone = knownZone(zone)
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(start)
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  })
  return {
    day,
    hours: `${time.format(start)} – ${time.format(end)} (${zoneName(timeZone)})`,
  }
}

/** Whether two zones show the same clock at `at`. */
const sameClock = (at: Date, a: string, b: string) => {
  const format = (timeZone: string) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(at)
  return format(knownZone(a)) === format(knownZone(b))
}

export type TrialEmailData = {
  parentName: string
  studentName: string
  studentGrade: string
  programLabel: string
  tutorName: string
  start: Date
  end: Date
  joinUrl: string
  roomCode: string
  /** The family's time zone (their email reads in it). */
  familyTimeZone: string | null
  /** The tutor's time zone (their email reads in it). */
  tutorTimeZone: string | null
}

const gradeText = (grade: string) =>
  !grade ? '' : grade === 'K' ? 'Kindergarten' : `Grade ${grade}`

/** To the family: the trial's time and the link to join without an account. */
export function trialInviteEmail(data: TrialEmailData): RenderedEmail {
  const when = classTime(data.start, data.end, knownZone(data.familyTimeZone))
  const firstName = data.parentName.split(/\s+/)[0] || 'there'
  const layout: Layout = {
    preheader: `${when.day}, ${when.hours}. Join from this email: no app, no account.`,
    heading: `${data.studentName}'s trial class is booked`,
    intro: [
      `Hi ${firstName},`,
      `Thank you for booking a free trial with Tech Talk Hub. ${data.studentName} will build a small project live with ${data.tutorName}, and you'll see how our classes work.`,
      'The class runs in our own online classroom, right in the browser. There is nothing to install and no account to create.',
    ],
    ticket: {
      day: when.day,
      hours: when.hours,
      caption: `Free trial · ${data.programLabel} · with ${data.tutorName}`,
      cta: { label: 'Join the trial class', url: data.joinUrl },
      note: 'The classroom opens 15 minutes before the class starts.',
      calendarUrl: googleCalendarUrl({
        title: `${data.studentName}'s trial class · Tech Talk Hub`,
        start: data.start,
        end: data.end,
        details: `Join the class: ${data.joinUrl}`,
        location: data.joinUrl,
      }),
    },
    details: [
      {
        label: 'Student',
        value: [data.studentName, gradeText(data.studentGrade)]
          .filter(Boolean)
          .join(' · '),
      },
      { label: 'Program', value: data.programLabel },
      { label: 'Tutor', value: data.tutorName },
      { label: 'Class length', value: lengthText(data.start, data.end) },
      { label: 'Class ID', value: data.roomCode },
    ],
    steps: {
      title: 'Getting ready',
      items: [
        'Use a laptop or desktop computer with Chrome, Edge or Safari. A tablet works too.',
        'Open the link a few minutes early and allow the camera and microphone when the browser asks.',
        `Type ${data.studentName}'s name and press Join. ${data.tutorName} will be there to start the class.`,
        'For the last few minutes, a parent joins to hear how it went and what comes next.',
      ],
    },
    footnote: `You're receiving this because a trial class was booked for ${data.studentName} with Tech Talk Hub.`,
  }
  return {
    subject: `${data.studentName}'s free trial class · ${when.day}`,
    html: renderLayout(layout),
    text: renderText(layout),
  }
}

/** "60 minutes" */
function lengthText(start: Date, end: Date): string {
  const minutes = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  )
  if (minutes % 60 === 0 && minutes >= 120) return `${minutes / 60} hours`
  return `${minutes} minutes`
}

/** To the tutor: a new trial is on their calendar, with the classroom link. */
export function tutorTrialEmail(
  data: TrialEmailData & { tutorUrl: string; notes: string | null },
): RenderedEmail {
  const tutorZone = knownZone(data.tutorTimeZone)
  const familyZone = knownZone(data.familyTimeZone)
  const when = classTime(data.start, data.end, tutorZone)
  // The family's own time, when their clock differs from the tutor's.
  const familyTime = sameClock(data.start, tutorZone, familyZone)
    ? null
    : classTime(data.start, data.end, familyZone)
  const layout: Layout = {
    preheader: `${data.studentName} (${gradeText(data.studentGrade) || data.programLabel}) on ${when.day}.`,
    heading: `New trial with ${data.studentName}`,
    intro: [
      `Hi ${data.tutorName.split(/\s+/)[0] || 'there'},`,
      'A free trial class has been booked into your open slot. It runs in the Tech Talk Hub classroom; the family has been emailed the join link.',
    ],
    ticket: {
      day: when.day,
      hours: when.hours,
      caption: `Free trial · ${data.programLabel}`,
      cta: { label: 'Open the classroom', url: data.tutorUrl },
      note: 'Sign in with your tutor account to host the class.',
      calendarUrl: googleCalendarUrl({
        title: `Trial: ${data.studentName} · Tech Talk Hub`,
        start: data.start,
        end: data.end,
        details: `Host the class: ${data.tutorUrl}`,
        location: data.tutorUrl,
      }),
    },
    details: [
      {
        label: 'Student',
        value: [data.studentName, gradeText(data.studentGrade)]
          .filter(Boolean)
          .join(' · '),
      },
      { label: 'Program', value: data.programLabel },
      { label: 'Class ID', value: data.roomCode },
      ...(familyTime
        ? [
            {
              label: 'Family’s time',
              value: `${familyTime.hours}, ${familyTime.day}`,
            },
          ]
        : []),
      ...(data.notes ? [{ label: 'Notes from sales', value: data.notes }] : []),
    ],
    steps: {
      title: 'Before the trial',
      items: [
        'Read the student’s grade and the notes on the trial in My Schedule.',
        'Open the classroom 5–10 minutes early and test your camera and microphone.',
        'Have a project ready for this age group, plus a backup.',
      ],
    },
    footnote:
      'This trial is also on your calendar under My Schedule in the tutor dashboard.',
  }
  return {
    subject: `New trial: ${data.studentName} · ${when.day}`,
    html: renderLayout(layout),
    text: renderText(layout),
  }
}

/** 20261122T130000Z */
const icsStamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
/** Escapes text for an iCalendar property. */
const icsText = (value: string) =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')

/** An iCalendar event so the class lands in the reader's own calendar. */
export function trialCalendarFile(input: {
  uid: string
  start: Date
  end: Date
  title: string
  description: string
  url: string
}): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tech Talk Hub//Trial classes//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}@techtalk-hub.com`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(input.start)}`,
    `DTEND:${icsStamp(input.end)}`,
    `SUMMARY:${icsText(input.title)}`,
    `DESCRIPTION:${icsText(input.description)}`,
    `URL:${input.url}`,
    `LOCATION:${icsText(input.url)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(input.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}

/**
 * Password reset, sent by our own mailer (server/routes/passwordReset.ts)
 * instead of Supabase's default email, in the same look as the trial emails.
 */
export function passwordResetEmail(data: {
  name: string | null
  resetUrl: string
}): RenderedEmail {
  const firstName = data.name?.trim().split(/\s+/)[0] || 'there'
  const heading = 'Reset your password'
  const intro = [
    `Hi ${firstName},`,
    'Someone asked to reset the password for your Tech Talk Hub account. If it was you, choose a new password with the button below.',
    'The link works once and expires after an hour.',
  ]
  const footnote =
    'Didn’t ask for this? You can ignore this email: your password stays the same.'
  const paragraphs = intro
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:26px;color:${INK};">${esc(line)}</p>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(heading)}</title>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  body { margin: 0; padding: 0; }
  @media (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .button { width: 100% !important; }
    .button a { display: block !important; text-align: center !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${CANVAS};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">Choose a new password for your Tech Talk Hub account.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${CANVAS}" style="background:${CANVAS};">
    <tr>
      <td align="center" style="padding:28px 12px 36px;">
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td class="px" style="padding:0 40px 18px;font-family:${FONT};font-size:20px;line-height:26px;font-weight:800;color:${BRAND};letter-spacing:-0.3px;">
              Tech Talk Hub
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background:#ffffff;border-radius:22px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="px" style="padding:40px 40px 6px;">
                    <h1 style="margin:0 0 18px;font-family:${FONT};font-size:30px;line-height:36px;font-weight:800;letter-spacing:-0.6px;color:${INK};">${esc(heading)}</h1>
                    ${paragraphs}
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:6px 40px 0;">
                    <table role="presentation" class="button" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="${BRAND}" style="background:${BRAND};border-radius:999px;">
                          <a href="${esc(data.resetUrl)}" style="display:inline-block;padding:16px 30px;font-family:${FONT};font-size:17px;line-height:22px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:999px;">Choose a new password&nbsp;&rarr;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:18px 40px 0;">
                    <p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">Button not working? Copy this link into your browser:<br><a href="${esc(data.resetUrl)}" style="color:${BRAND};word-break:break-all;">${esc(data.resetUrl)}</a></p>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:26px 40px 40px;">
                    <p style="margin:0;font-family:${FONT};font-size:16px;line-height:25px;color:${INK};">Need help signing in? Message us on WhatsApp at <a href="${SUPPORT.whatsappUrl}" style="color:${BRAND_STRONG};font-weight:800;text-decoration:none;white-space:nowrap;">${SUPPORT.whatsappDisplay}</a>, or just reply to this email.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="px" style="padding:22px 40px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};">
              ${esc(footnote)}<br>
              &copy; ${new Date().getFullYear()} Tech Talk Hub &middot; Coding and AI classes for children
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = [
    heading,
    '',
    ...intro,
    '',
    `Choose a new password: ${data.resetUrl}`,
    '',
    `Need help signing in? WhatsApp ${SUPPORT.whatsappDisplay} (${SUPPORT.whatsappUrl}), or reply to this email.`,
    '',
    footnote,
  ].join('\n')

  return { subject: 'Reset your Tech Talk Hub password', html, text }
}
