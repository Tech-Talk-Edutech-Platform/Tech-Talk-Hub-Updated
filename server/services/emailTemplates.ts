/**
 * HTML emails. Table layout with inline styles, because that's what mail apps
 * (Gmail, Outlook, Apple Mail) render reliably. Every value from the database
 * goes through `esc()`.
 *
 * Brand colours match the site (src/index.css): brand #3f51b5, ink #172554,
 * pink #db2777.
 */

const BRAND = '#3f51b5'
const BRAND_STRONG = '#303f9f'
const BRAND_SOFT = '#eef0fa'
const PINK = '#db2777'
const INK = '#172554'
const MUTED = '#64748b'
const LINE = '#e2e8f0'
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export const SUPPORT = {
  whatsappDisplay: '+254 704 494 504',
  whatsappUrl: 'https://wa.me/254704494504',
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
  eyebrow: string
  heading: string
  /** Plain sentences; each becomes a paragraph. */
  intro: string[]
  details: Detail[]
  cta: { label: string; url: string; note: string }
  steps: { title: string; items: string[] }
  footnote: string
}

function renderLayout(layout: Layout): string {
  const paragraphs = layout.intro
    .map(
      (line) =>
        `<p style="margin:0 0 14px;font-size:16px;line-height:26px;color:${INK};">${esc(line)}</p>`,
    )
    .join('')

  const detailRows = layout.details
    .map(
      (detail, index) => `
        <tr>
          <td style="padding:12px 18px;${index > 0 ? `border-top:1px solid ${LINE};` : ''}font-size:13px;line-height:20px;color:${MUTED};width:38%;vertical-align:top;">${esc(detail.label)}</td>
          <td style="padding:12px 18px;${index > 0 ? `border-top:1px solid ${LINE};` : ''}font-size:15px;line-height:22px;color:${INK};font-weight:600;vertical-align:top;">${esc(detail.value)}</td>
        </tr>`,
    )
    .join('')

  const stepRows = layout.steps.items
    .map(
      (item, index) => `
        <tr>
          <td style="padding:0 12px 12px 0;vertical-align:top;width:28px;">
            <div style="width:26px;height:26px;border-radius:13px;background:${BRAND_SOFT};color:${BRAND_STRONG};font-size:13px;line-height:26px;font-weight:700;text-align:center;">${index + 1}</div>
          </td>
          <td style="padding:2px 0 12px;font-size:15px;line-height:23px;color:${INK};vertical-align:top;">${esc(item)}</td>
        </tr>`,
    )
    .join('')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(layout.heading)}</title>
<style>
  @media (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 22px !important; padding-right: 22px !important; }
    .cta a { display: block !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f1f3fb;font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(layout.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f3fb;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:0 4px 18px;font-size:18px;line-height:24px;font-weight:800;color:${BRAND};letter-spacing:-0.2px;">
              Tech Talk Hub <span style="font-size:12px;font-weight:600;color:${MUTED};letter-spacing:0;">&nbsp;Think. Code. Create.</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 40px -24px rgba(63,81,181,0.45);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height:6px;background:${BRAND};background-image:linear-gradient(90deg, ${BRAND} 0%, ${PINK} 100%);font-size:0;line-height:0;">&nbsp;</td>
                </tr>
                <tr>
                  <td class="px" style="padding:36px 40px 8px;">
                    <p style="margin:0 0 10px;font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${PINK};">${esc(layout.eyebrow)}</p>
                    <h1 style="margin:0 0 18px;font-size:28px;line-height:34px;font-weight:800;letter-spacing:-0.5px;color:${INK};">${esc(layout.heading)}</h1>
                    ${paragraphs}
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:8px 40px 4px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${LINE};border-radius:14px;border-collapse:separate;">
                      ${detailRows}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="px cta" align="center" style="padding:28px 40px 8px;">
                    <a href="${esc(layout.cta.url)}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-size:17px;line-height:22px;font-weight:700;padding:16px 34px;border-radius:12px;">${esc(layout.cta.label)} &rarr;</a>
                    <p style="margin:12px 0 0;font-size:13px;line-height:20px;color:${MUTED};">${esc(layout.cta.note)}</p>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:12px 40px 0;">
                    <p style="margin:0;font-size:12px;line-height:18px;color:${MUTED};">Button not working? Copy this link into your browser:<br><a href="${esc(layout.cta.url)}" style="color:${BRAND};word-break:break-all;">${esc(layout.cta.url)}</a></p>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:30px 40px 10px;">
                    <p style="margin:0 0 14px;font-size:16px;line-height:22px;font-weight:800;color:${INK};">${esc(layout.steps.title)}</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${stepRows}</table>
                  </td>
                </tr>
                <tr>
                  <td class="px" style="padding:8px 40px 34px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND_SOFT};border-radius:12px;">
                      <tr>
                        <td style="padding:16px 18px;font-size:14px;line-height:21px;color:${INK};">
                          Questions or need to change the time? Message us on WhatsApp:
                          <a href="${SUPPORT.whatsappUrl}" style="color:${BRAND_STRONG};font-weight:700;text-decoration:none;white-space:nowrap;">${SUPPORT.whatsappDisplay}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;font-size:12px;line-height:18px;color:${MUTED};text-align:center;">
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
  return [
    layout.heading,
    '',
    ...layout.intro,
    '',
    ...layout.details.map((detail) => `${detail.label}: ${detail.value}`),
    '',
    `${layout.cta.label}: ${layout.cta.url}`,
    layout.cta.note,
    '',
    layout.steps.title,
    ...layout.steps.items.map((item, index) => `${index + 1}. ${item}`),
    '',
    `Questions? WhatsApp ${SUPPORT.whatsappDisplay} (${SUPPORT.whatsappUrl})`,
    '',
    layout.footnote,
  ].join('\n')
}

const NAIROBI = 'Africa/Nairobi'

/** e.g. "Saturday, 22 November 2026" and "4:00 PM – 5:00 PM (East Africa Time)". */
export function classTime(start: Date, end: Date) {
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone: NAIROBI,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(start)
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: NAIROBI,
    hour: 'numeric',
    minute: '2-digit',
  })
  return {
    day,
    hours: `${time.format(start)} – ${time.format(end)} (East Africa Time)`,
  }
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
}

const gradeText = (grade: string) =>
  !grade ? '' : grade === 'K' ? 'Kindergarten' : `Grade ${grade}`

/** To the family: the trial's time and the link to join without an account. */
export function trialInviteEmail(data: TrialEmailData): RenderedEmail {
  const when = classTime(data.start, data.end)
  const firstName = data.parentName.split(/\s+/)[0] || 'there'
  const layout: Layout = {
    preheader: `${data.studentName}'s free trial class is on ${when.day}. Here's the link to join.`,
    eyebrow: 'Free trial class',
    heading: `${data.studentName}'s trial class is booked!`,
    intro: [
      `Hi ${firstName},`,
      `Thank you for booking a free trial with Tech Talk Hub. ${data.studentName} will build a small project live with ${data.tutorName}, and you'll see how our classes work.`,
      'The class runs in our own online classroom, right in the browser. There is nothing to install and no account to create.',
    ],
    details: [
      {
        label: 'Student',
        value: [data.studentName, gradeText(data.studentGrade)]
          .filter(Boolean)
          .join(' · '),
      },
      { label: 'Program', value: data.programLabel },
      { label: 'Date', value: when.day },
      { label: 'Time', value: when.hours },
      { label: 'Tutor', value: data.tutorName },
      { label: 'Class ID', value: data.roomCode },
    ],
    cta: {
      label: 'Join the trial class',
      url: data.joinUrl,
      note: 'The classroom opens 15 minutes before the class starts.',
    },
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

/** To the tutor: a new trial is on their calendar, with the classroom link. */
export function tutorTrialEmail(
  data: TrialEmailData & { tutorUrl: string; notes: string | null },
): RenderedEmail {
  const when = classTime(data.start, data.end)
  const layout: Layout = {
    preheader: `${data.studentName} (${gradeText(data.studentGrade) || data.programLabel}) on ${when.day}.`,
    eyebrow: 'New trial on your calendar',
    heading: `Trial with ${data.studentName}`,
    intro: [
      `Hi ${data.tutorName.split(/\s+/)[0] || 'there'},`,
      'A free trial class has been booked into your open slot. It runs in the Tech Talk Hub classroom; the family has been emailed the join link.',
    ],
    details: [
      {
        label: 'Student',
        value: [data.studentName, gradeText(data.studentGrade)]
          .filter(Boolean)
          .join(' · '),
      },
      { label: 'Program', value: data.programLabel },
      { label: 'Date', value: when.day },
      { label: 'Time', value: when.hours },
      { label: 'Class ID', value: data.roomCode },
      ...(data.notes ? [{ label: 'Notes from sales', value: data.notes }] : []),
    ],
    cta: {
      label: 'Open the classroom',
      url: data.tutorUrl,
      note: 'Sign in with your tutor account to host the class.',
    },
    steps: {
      title: 'Before the trial',
      items: [
        'Read the student’s grade and the notes under Trial bookings in your dashboard.',
        'Open the classroom 5–10 minutes early and test your camera and microphone.',
        'Have a project ready for this age group, plus a backup.',
      ],
    },
    footnote: 'This trial is also on your calendar in the tutor dashboard.',
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
