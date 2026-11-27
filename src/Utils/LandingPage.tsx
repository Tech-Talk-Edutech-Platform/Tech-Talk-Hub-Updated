import { useState, useSyncExternalStore } from 'react'
import { supabase } from '../supabase'
import type { ChangeEvent, FormEvent } from 'react'
import { staticPageMeta } from '../data/seo'
import { sendWaitingInvites } from '../lib/sendWaitingInvites'
import { usePageMeta } from '../hooks/usePageMeta'
import { CountryFlag } from '../components/CountryFlag'
import { BOOKABLE_TIMES } from '../features/sales/shifts'
import {
  addDaysToKey,
  browserTimeZone,
  dateKeyIn,
  dateTimeIn,
  DEFAULT_TIME_ZONE,
  sameClock,
  timeKeyIn,
  zonedTimeToMs,
  zonePlace,
} from '../lib/timeZones'

/** Families book at least this far ahead, so a tutor can be matched. */
const NOTICE_HOURS = 3
const NOTICE_MS = NOTICE_HOURS * 60 * 60_000

const noSubscription = () => () => undefined

/** Re-reads a browser value each minute, so "earliest time" keeps up. */
const everyMinute = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 60_000)
  return () => window.clearInterval(timer)
}

/**
 * A value only the browser knows (its time zone, today's date). The page is
 * pre-rendered at build time, so the server's value is used until it
 * hydrates, then the browser's.
 */
const useBrowserValue = (
  read: () => string,
  server: string,
  subscribe: (onChange: () => void) => () => void = noSubscription,
) => useSyncExternalStore(subscribe, read, () => server)

/** "8:00 AM" for "08:00". */
const timeLabel = (time: string) => {
  const [hour = 0, minute = 0] = time.split(':').map(Number)
  return new Date(Date.UTC(2000, 0, 1, hour, minute)).toLocaleTimeString(
    'en-US',
    {
      timeZone: 'UTC',
      hour: 'numeric',
      minute: '2-digit',
    },
  )
}

/**
 * "2026-11-27T15:30": the first bookable day and time on the family's clock,
 * at least NOTICE_HOURS from now. Past days and too-soon times come before it.
 */
function firstBookableSlot(zone: string): string {
  const earliest = Date.now() + NOTICE_MS
  const date = dateKeyIn(earliest, zone)
  const time = timeKeyIn(earliest, zone)
  const later = BOOKABLE_TIMES.find((slot) => slot >= time)
  return later
    ? `${date}T${later}`
    : `${addDaysToKey(date, 1)}T${BOOKABLE_TIMES[0]}`
}

const COUNTRIES = [
  {
    name: 'Kenya',
    region: 'KE',
    code: '+254',
    example: '712 345 678',
    zone: 'Africa/Nairobi',
  },
  {
    name: 'Uganda',
    region: 'UG',
    code: '+256',
    example: '772 123 456',
    zone: 'Africa/Kampala',
  },
  {
    name: 'Tanzania',
    region: 'TZ',
    code: '+255',
    example: '712 345 678',
    zone: 'Africa/Dar_es_Salaam',
  },
  {
    name: 'Ghana',
    region: 'GH',
    code: '+233',
    example: '24 123 4567',
    zone: 'Africa/Accra',
  },
  {
    name: 'Nigeria',
    region: 'NG',
    code: '+234',
    example: '803 123 4567',
    zone: 'Africa/Lagos',
  },
  {
    name: 'South Africa',
    region: 'ZA',
    code: '+27',
    example: '82 123 4567',
    zone: 'Africa/Johannesburg',
  },
] as const

/** Kenya, Uganda and Tanzania share a clock, so their zones get mixed up. */
const EAST_AFRICA: ReadonlySet<string> = new Set(['KE', 'UG', 'TZ'])

/** The browser language's region: "UG" for "en-UG", else undefined. */
function languageRegion(tag: string): string | undefined {
  try {
    return new Intl.Locale(tag).region
  } catch {
    return undefined
  }
}

/** The family's country from the device's time zone, or '' when it isn't one we serve. */
function detectCountry(zone: string): string {
  const byZone = COUNTRIES.find((country) => country.zone === zone)
  if (!byZone) return ''
  if (EAST_AFRICA.has(byZone.region)) {
    // A Ugandan phone can report Nairobi time; its language ("en-UG") tells.
    for (const tag of navigator.languages) {
      const region = languageRegion(tag)
      const match = COUNTRIES.find((country) => country.region === region)
      if (match && EAST_AFRICA.has(match.region)) return match.name
    }
  }
  return byZone.name
}

/**
 * "+254712345678" from the number typed after the country code: "0712 345
 * 678", "712345678" or "+254 712 345 678" all work. Null when it can't be a
 * phone number.
 */
function internationalPhone(dialCode: string, typed: string): string | null {
  const digits = typed.replace(/\D/g, '')
  const code = dialCode.replace(/\D/g, '')
  let full: string
  if (typed.trim().startsWith('+')) full = digits
  else if (digits.startsWith('00')) full = digits.slice(2)
  else if (digits.startsWith(code) && digits.length - code.length >= 9)
    full = digits
  else full = code + digits.replace(/^0+/, '')
  // These countries use 9 or 10 digits after the code.
  if (full.startsWith(code)) {
    const national = full.length - code.length
    return national >= 9 && national <= 10 ? `+${full}` : null
  }
  return full.length >= 10 && full.length <= 15 ? `+${full}` : null
}

interface LeadForm {
  parent_name: string
  parent_email: string
  student_name: string
  phone: string
  grade: string
  preferred_date: string
  preferred_time: string
  country: string
}

type LeadField = keyof LeadForm
type LeadErrors = Partial<Record<LeadField, boolean>>

const EMPTY_FORM: LeadForm = {
  parent_name: '',
  parent_email: '',
  student_name: '',
  phone: '',
  grade: '',
  preferred_date: '',
  preferred_time: '',
  country: '',
}

const GRADES = ['K', ...Array.from({ length: 12 }, (_, i) => String(i + 1))]

export default function LandingPage() {
  usePageMeta(staticPageMeta('/book'))
  // The family picks a day and time on their own clock, read from the
  // device; tutors see the same moment on theirs.
  const zone = useBrowserValue(browserTimeZone, DEFAULT_TIME_ZONE)
  const detectedCountry = useBrowserValue(() => detectCountry(zone), '')
  const firstSlot = useBrowserValue(
    () => firstBookableSlot(zone),
    '',
    everyMinute,
  )
  const [minDate = '', minTime = ''] = firstSlot.split('T')

  const [booked, setBooked] = useState<{ start: number; zone: string } | null>(
    null,
  )
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<LeadErrors>({})
  const [tooSoon, setTooSoon] = useState(false)

  // Until the parent picks one, the country comes from their device.
  const country = form.country || detectedCountry
  const dialCode = COUNTRIES.find((c) => c.name === country)?.code ?? ''

  // On the first bookable day, only times far enough ahead.
  const times =
    form.preferred_date && form.preferred_date === minDate
      ? BOOKABLE_TIMES.filter((time) => time >= minTime)
      : BOOKABLE_TIMES
  const time = times.includes(form.preferred_time) ? form.preferred_time : ''

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: false })
  }

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, preferred_date: e.target.value })
    setErrors({ ...errors, preferred_date: false, preferred_time: false })
    setTooSoon(false)
  }

  const handleTimeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, preferred_time: e.target.value })
    setErrors({ ...errors, preferred_date: false, preferred_time: false })
    setTooSoon(false)
  }

  const submitForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const newErrors: LeadErrors = {}
    const required: LeadField[] = [
      'parent_name',
      'parent_email',
      'student_name',
      'grade',
    ]
    required.forEach((field) => {
      if (!form[field].trim()) newErrors[field] = true
    })
    if (!country) newErrors.country = true
    const phone = dialCode ? internationalPhone(dialCode, form.phone) : null
    if (!phone) newErrors.phone = true
    if (!form.preferred_date) newErrors.preferred_date = true
    if (!time) newErrors.preferred_time = true

    // The moment they picked, on their own clock.
    const start =
      form.preferred_date && time
        ? zonedTimeToMs(form.preferred_date, time, zone)
        : null
    const soon = start !== null && start < Date.now() + NOTICE_MS
    if (soon) {
      newErrors.preferred_date = true
      newErrors.preferred_time = true
    }
    setTooSoon(soon)
    if (Object.keys(newErrors).length || start === null || !phone) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('leads').insert([
        {
          parent_name: form.parent_name.trim(),
          student_name: form.student_name.trim(),
          email: form.parent_email.trim(),
          phone,
          grade: form.grade,
          country,
          // Saved as Nairobi wall-clock time, which tutors' slots and the
          // schedule use, plus the family's zone to show it back in theirs.
          class_date: dateKeyIn(start, DEFAULT_TIME_ZONE),
          class_time: `${timeKeyIn(start, DEFAULT_TIME_ZONE)}:00`,
          time_zone: zone,
          lead_source: 'landing_page',
          referal_code: '',
          status: 'new',
        },
      ])
      setLoading(false)

      if (error) {
        console.error(error)
        alert('Something went wrong. Try again.')
        return
      }
      // A trial booked into a tutor's slot gets its class link by email.
      sendWaitingInvites()
      setBooked({ start, zone })
      setForm(EMPTY_FORM)
    } catch (err) {
      console.error(err)
      setLoading(false)
      alert('Something went wrong. Try again.')
    }
  }

  // What the picked time is in Nairobi, where the tutors are.
  const picked =
    form.preferred_date && time
      ? zonedTimeToMs(form.preferred_date, time, zone)
      : null
  const tutorTime =
    picked !== null && !sameClock(picked, zone, DEFAULT_TIME_ZONE)
      ? dateTimeIn(picked, DEFAULT_TIME_ZONE)
      : null

  const selected = COUNTRIES.find((c) => c.name === country)
  const fieldClass =
    'block w-full min-w-0 rounded-xl border bg-white py-2.5 text-base outline-hidden transition-all duration-300 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-400 focus:shadow-lg focus:shadow-purple-300/30 lg:py-2'
  const border = (name: LeadField) =>
    errors[name] ? 'border-red-500' : 'border-purple-400'
  const inputClass = (name: LeadField, extra = 'px-4 text-gray-900') =>
    `${fieldClass} ${border(name)} ${extra}`
  const contactError = Boolean(errors.phone || errors.country)
  const labelClass = 'mb-1 block text-sm font-semibold text-gray-700 lg:mb-0.5'

  return (
    <section className="relative min-h-dvh overflow-hidden bg-gray-50 px-4 py-5 sm:px-6 lg:flex lg:items-center lg:px-12 lg:py-6">
      <img
        src="/TechTalkBrand.png"
        alt="Tech Talk Hub"
        className="h-10 lg:absolute lg:top-4 lg:left-8 lg:z-20 lg:h-12"
      />

      {/* Phones: heading, then form. Large screens: heading over the
          picture on the left, form on the right. */}
      <div className="mx-auto mt-5 grid w-full max-w-xl grid-cols-1 gap-5 lg:mt-0 lg:max-w-6xl lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-12 lg:gap-y-6 xl:gap-x-16">
        <div className="relative z-20 text-center lg:col-start-1 lg:row-start-1 lg:pt-10 lg:text-left">
          <h1 className="text-2xl leading-tight font-extrabold text-balance text-gray-900 sm:text-3xl xl:text-4xl">
            Give Your Child a Confident Start in Coding 🚀
          </h1>
          <p className="mt-1.5 text-gray-600">
            Book a free 1-on-1 coding trial with a certified tutor.
          </p>
        </div>

        <div className="relative hidden items-start justify-start lg:col-start-1 lg:row-start-2 lg:flex">
          <div className="animate-rotate-slow absolute -top-16 -left-16 h-72 w-72 rounded-full bg-linear-to-tr from-blue-400 via-purple-400 to-pink-400 opacity-60" />
          <div className="animate-rotate-slow reverse absolute -right-10 -bottom-10 h-56 w-56 rounded-full bg-linear-to-br from-purple-300 via-pink-300 to-yellow-200 opacity-50" />
          <img
            src="/girl-code.png"
            alt="Child coding"
            className="relative z-10 h-auto max-h-[calc(100dvh-16rem)] w-auto max-w-full rounded-3xl shadow-2xl xl:max-w-lg"
          />
        </div>

        <div className="relative w-full lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          {booked ? (
            <div className="rounded-3xl border border-green-200 bg-green-50 p-6 text-center sm:p-8">
              <h2 className="text-2xl font-bold text-green-800">
                Booking Confirmed!
              </h2>
              <p className="mt-3 font-semibold text-green-800">
                {dateTimeIn(booked.start, booked.zone)} (
                {zonePlace(booked.zone)} time)
              </p>
              <p className="mt-2 text-green-700">
                We’ll match a tutor to that time and email you the class link.
                We may also reach out on WhatsApp.
              </p>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(event) => void submitForm(event)}
              className="space-y-3 rounded-3xl border border-gray-100 bg-white p-4 shadow-lg sm:p-6 lg:space-y-2 lg:p-5"
            >
              <div>
                <label htmlFor="book-parent-name" className={labelClass}>
                  Parent name
                </label>
                <input
                  id="book-parent-name"
                  name="parent_name"
                  placeholder="Your full name"
                  autoComplete="name"
                  enterKeyHint="next"
                  value={form.parent_name}
                  onChange={handleChange}
                  className={inputClass('parent_name')}
                />
              </div>

              <div>
                <label htmlFor="book-parent-email" className={labelClass}>
                  Parent email
                </label>
                <input
                  id="book-parent-email"
                  name="parent_email"
                  type="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={form.parent_email}
                  onChange={handleChange}
                  className={inputClass('parent_email')}
                />
              </div>

              <div>
                <label htmlFor="book-student-name" className={labelClass}>
                  Student name
                </label>
                <input
                  id="book-student-name"
                  name="student_name"
                  placeholder="Your child’s name"
                  autoComplete="off"
                  enterKeyHint="next"
                  value={form.student_name}
                  onChange={handleChange}
                  className={inputClass('student_name')}
                />
              </div>

              <div>
                <label htmlFor="book-grade" className={labelClass}>
                  Grade
                </label>
                <select
                  id="book-grade"
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  className={inputClass(
                    'grade',
                    `px-4 ${form.grade ? 'text-gray-900' : 'text-gray-400'}`,
                  )}
                >
                  <option value="" disabled>
                    Choose a grade
                  </option>
                  {GRADES.map((grade) => (
                    <option key={grade} value={grade} className="text-gray-900">
                      {grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phone: the flag opens the country list, which sets the code. */}
              <div>
                <label htmlFor="book-phone" className={labelClass}>
                  Phone number
                </label>
                <div
                  className={`flex min-w-0 items-stretch rounded-xl border bg-white transition-all duration-300 focus-within:shadow-lg focus-within:ring-2 focus-within:shadow-purple-300/30 focus-within:ring-purple-400 ${contactError ? 'border-red-500' : 'border-purple-400'}`}
                >
                  <div className="relative flex shrink-0 items-center gap-1.5 rounded-l-xl pr-1 pl-3.5 hover:bg-gray-50">
                    {selected ? (
                      <CountryFlag region={selected.region} />
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z" />
                      </svg>
                    )}
                    <svg
                      viewBox="0 0 10 6"
                      aria-hidden="true"
                      className="h-1.5 w-2.5 text-gray-600"
                    >
                      <path d="M0 0h10L5 6z" fill="currentColor" />
                    </svg>
                    <select
                      name="country"
                      aria-label="Country"
                      value={country}
                      onChange={handleChange}
                      className="absolute inset-0 w-full cursor-pointer opacity-0"
                    >
                      <option value="" disabled>
                        Choose your country
                      </option>
                      {COUNTRIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <span
                    className="flex items-center pl-2.5 text-base text-gray-900 tabular-nums"
                    aria-hidden="true"
                  >
                    {dialCode}
                  </span>
                  <input
                    id="book-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    enterKeyHint="next"
                    placeholder={selected?.example ?? 'Phone number'}
                    aria-describedby={
                      contactError ? 'book-phone-note' : undefined
                    }
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full min-w-0 rounded-r-xl bg-transparent py-2.5 pr-4 pl-2 text-base text-gray-900 outline-hidden placeholder:text-gray-400 lg:py-2"
                  />
                </div>
                {contactError && (
                  <p
                    id="book-phone-note"
                    className="mt-1 text-xs font-semibold text-red-600"
                  >
                    {dialCode
                      ? `Enter your full ${country} phone number.`
                      : 'Tap the globe to choose your country, then enter your number.'}
                  </p>
                )}
              </div>

              {/* When: the one row with two fields side by side. */}
              <fieldset>
                <legend className="sr-only">When suits you?</legend>
                <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                  <div className="min-w-0">
                    <label htmlFor="book-date" className={labelClass}>
                      Trial day
                    </label>
                    <input
                      id="book-date"
                      type="date"
                      min={minDate || undefined}
                      name="preferred_date"
                      value={form.preferred_date}
                      onChange={handleDateChange}
                      aria-describedby="book-time-note"
                      className={inputClass(
                        'preferred_date',
                        'min-h-11 px-2.5 text-gray-900 sm:px-4 lg:min-h-10 [&::-webkit-date-and-time-value]:text-left',
                      )}
                    />
                  </div>
                  <div className="min-w-0">
                    <label htmlFor="book-time" className={labelClass}>
                      Trial time
                    </label>
                    <select
                      id="book-time"
                      name="preferred_time"
                      value={time}
                      onChange={handleTimeChange}
                      aria-describedby="book-time-note"
                      className={inputClass(
                        'preferred_time',
                        `min-h-11 px-2.5 sm:px-4 lg:min-h-10 ${time ? 'text-gray-900' : 'text-gray-400'}`,
                      )}
                    >
                      <option value="" disabled>
                        Pick a time
                      </option>
                      {times.map((slot) => (
                        <option
                          key={slot}
                          value={slot}
                          className="text-gray-900"
                        >
                          {timeLabel(slot)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p
                  id="book-time-note"
                  className={`mt-1.5 text-xs ${tooSoon ? 'font-semibold text-red-600' : 'text-gray-500'}`}
                >
                  {tooSoon
                    ? `Pick a time at least ${NOTICE_HOURS} hours from now, so we can match a tutor.`
                    : tutorTime
                      ? `Times are in your time zone (${zonePlace(zone)}). That’s ${tutorTime} in Nairobi, where our tutors are.`
                      : `Times are in your time zone (${zonePlace(zone)}), from ${NOTICE_HOURS} hours ahead.`}
                </p>
              </fieldset>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50 lg:py-2.5"
              >
                {loading ? 'Booking...' : 'Book Free Trial'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
