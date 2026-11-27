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
    zone: 'Africa/Nairobi',
  },
  {
    name: 'Uganda',
    region: 'UG',
    code: '+256',
    zone: 'Africa/Kampala',
  },
  {
    name: 'Tanzania',
    region: 'TZ',
    code: '+255',
    zone: 'Africa/Dar_es_Salaam',
  },
  {
    name: 'Ghana',
    region: 'GH',
    code: '+233',
    zone: 'Africa/Accra',
  },
  {
    name: 'Nigeria',
    region: 'NG',
    code: '+234',
    zone: 'Africa/Lagos',
  },
  {
    name: 'South Africa',
    region: 'ZA',
    code: '+27',
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
  const ring =
    'transition-all duration-300 focus:ring-2 focus:ring-purple-400 focus:shadow-lg focus:shadow-purple-300/30'
  const fieldClass = `w-full min-w-0 rounded-xl border bg-white px-4 py-2.5 outline-hidden ${ring}`
  const border = (name: LeadField) =>
    errors[name] ? 'border-red-500' : 'border-purple-400'
  const inputClass = (name: LeadField) => `${fieldClass} ${border(name)}`
  const contactBorder =
    errors.phone || errors.country ? 'border-red-500' : 'border-purple-400'

  return (
    <section className="relative min-h-dvh overflow-hidden bg-gray-50 px-4 py-5 sm:px-6 lg:flex lg:items-center lg:px-12 lg:py-12">
      <img
        src="/TechTalkBrand.png"
        alt="Tech Talk Hub"
        className="h-10 lg:absolute lg:top-4 lg:left-8 lg:z-20 lg:h-12"
      />

      <div className="mx-auto mt-5 flex w-full max-w-6xl items-center gap-12 lg:mt-0 xl:gap-16">
        {/* Picture: large screens only, so the form leads everywhere else. */}
        <div className="relative hidden w-1/2 justify-center lg:flex">
          <div className="animate-rotate-slow absolute -top-20 -left-20 h-80 w-80 rounded-full bg-linear-to-tr from-blue-400 via-purple-400 to-pink-400 opacity-60" />
          <div className="animate-rotate-slow reverse absolute -right-12 -bottom-12 h-64 w-64 rounded-full bg-linear-to-br from-purple-300 via-pink-300 to-yellow-200 opacity-50" />
          <img
            src="/girl-code.png"
            alt="Child coding"
            className="relative z-10 max-h-[calc(100dvh-7rem)] w-full max-w-lg rounded-3xl object-cover shadow-2xl"
          />
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:w-1/2">
          <div className="mb-5 text-center lg:mb-4 lg:text-left">
            <h1 className="text-2xl leading-tight font-extrabold text-balance text-gray-900 sm:text-3xl">
              Give Your Child a Confident Start in Coding 🚀
            </h1>
            <p className="mt-1.5 text-gray-600">
              Book a free 1-on-1 coding trial with a certified tutor.
            </p>
          </div>

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
              className="space-y-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-lg sm:p-6"
            >
              {/* Parent */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  name="parent_name"
                  placeholder="Parent name"
                  aria-label="Parent name"
                  autoComplete="name"
                  value={form.parent_name}
                  onChange={handleChange}
                  className={inputClass('parent_name')}
                />
                <input
                  name="parent_email"
                  type="email"
                  placeholder="Parent email"
                  aria-label="Parent email"
                  autoComplete="email"
                  value={form.parent_email}
                  onChange={handleChange}
                  className={inputClass('parent_email')}
                />
              </div>

              {/* Student */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <input
                  name="student_name"
                  placeholder="Student name"
                  aria-label="Student name"
                  autoComplete="off"
                  value={form.student_name}
                  onChange={handleChange}
                  className={inputClass('student_name')}
                />
                <select
                  name="grade"
                  aria-label="Student grade"
                  value={form.grade}
                  onChange={handleChange}
                  className={`${inputClass('grade')} ${form.grade ? '' : 'text-gray-500'}`}
                >
                  <option value="" disabled>
                    Grade
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
                <div
                  className={`flex min-w-0 items-stretch rounded-xl border bg-white transition-all duration-300 focus-within:shadow-lg focus-within:ring-2 focus-within:shadow-purple-300/30 focus-within:ring-purple-400 ${contactBorder}`}
                >
                  <div className="relative flex shrink-0 items-center gap-1.5 rounded-l-xl pr-1 pl-4 hover:bg-gray-50">
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
                  <label className="flex min-w-0 flex-1 items-center">
                    <span className="pl-2.5 text-gray-900 tabular-nums">
                      {dialCode}
                    </span>
                    <input
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="Phone number"
                      aria-label={`Phone number${dialCode ? ` after ${dialCode}` : ''}`}
                      aria-describedby={
                        errors.phone || errors.country
                          ? 'book-phone-note'
                          : undefined
                      }
                      value={form.phone}
                      onChange={handleChange}
                      className="w-full min-w-0 rounded-r-xl bg-transparent py-2.5 pr-4 pl-2 outline-hidden"
                    />
                  </label>
                </div>
                {(errors.phone || errors.country) && (
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

              {/* When */}
              <fieldset>
                <legend className="sr-only">When suits you?</legend>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-600">
                      Trial day
                    </span>
                    <input
                      type="date"
                      min={minDate || undefined}
                      name="preferred_date"
                      value={form.preferred_date}
                      onChange={handleDateChange}
                      aria-describedby="book-time-note"
                      className={`${inputClass('preferred_date')} min-h-11 [&::-webkit-date-and-time-value]:text-left`}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-600">
                      Trial time
                    </span>
                    <select
                      name="preferred_time"
                      value={time}
                      onChange={handleTimeChange}
                      aria-describedby="book-time-note"
                      className={`${inputClass('preferred_time')} min-h-11 ${time ? '' : 'text-gray-500'}`}
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
                  </label>
                </div>
                {/* <p
                  id="book-time-note"
                  className={`mt-1.5 text-xs ${tooSoon ? 'font-semibold text-red-600' : 'text-gray-500'}`}
                >
                  {tooSoon
                    ? `Pick a time at least ${NOTICE_HOURS} hours from now, so we can match a tutor.`
                    : tutorTime
                      ? `Times are in your time zone (${zonePlace(zone)}). That’s ${tutorTime} in Nairobi, where our tutors are.`
                      : `Times are in your time zone (${zonePlace(zone)}), from ${NOTICE_HOURS} hours ahead.`}
                </p> */}
              </fieldset>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 py-3 font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
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
