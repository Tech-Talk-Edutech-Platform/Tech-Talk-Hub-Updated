import { useState, useSyncExternalStore } from 'react'
import { supabase } from '../supabase'
import type { ChangeEvent, FormEvent } from 'react'
import { staticPageMeta } from '../data/seo'
import { sendWaitingInvites } from '../lib/sendWaitingInvites'
import { usePageMeta } from '../hooks/usePageMeta'
import { TimeZoneSelect } from '../components/TimeZoneSelect'
import { BOOKABLE_TIMES } from '../features/sales/shifts'
import {
  browserTimeZone,
  dateKeyIn,
  dateTimeIn,
  DEFAULT_TIME_ZONE,
  sameClock,
  timeKeyIn,
  zonedTimeToMs,
  zonePlace,
} from '../lib/timeZones'

/** Families can book from an hour from now. */
const NOTICE_MS = 60 * 60_000

const noSubscription = () => () => undefined

/**
 * A value only the browser knows (its time zone, today's date). The page is
 * pre-rendered at build time, so the server's value is used until it
 * hydrates, then the browser's.
 */
const useBrowserValue = (read: () => string, server: string) =>
  useSyncExternalStore(noSubscription, read, () => server)

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

const countryOptions = [
  { name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { name: 'Uganda', code: '+256', flag: '🇺🇬' },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿' },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼' },
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'Ghana', code: '+233', flag: '🇬🇭' },
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'Other', code: '+', flag: '🌍' },
]

interface LeadForm {
  parent_name: string
  parent_email: string
  student_name: string
  phone: string
  grade: string
  preferred_date: string
  preferred_time: string
  country: string
  lead_source: string
  referral_code: string
}

type LeadField = keyof LeadForm
type LeadErrors = Partial<Record<LeadField, boolean>>

export default function LandingPage() {
  usePageMeta(staticPageMeta('/book'))
  // The family picks a date and time on their own clock; tutors see the
  // same moment on theirs.
  const detectedZone = useBrowserValue(browserTimeZone, DEFAULT_TIME_ZONE)
  const [chosenZone, setChosenZone] = useState<string | null>(null)
  const zone = chosenZone ?? detectedZone
  const today = useBrowserValue(() => dateKeyIn(Date.now(), zone), '')
  const [booked, setBooked] = useState<{ start: number; zone: string } | null>(
    null,
  )
  const [form, setForm] = useState<LeadForm>({
    parent_name: '',
    parent_email: '',
    student_name: '',
    phone: '',
    grade: '',
    preferred_date: '',
    preferred_time: '',
    country: '',
    lead_source: 'landing_page',
    referral_code: '',
  })

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<LeadErrors>({})

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: false })
  }

  const handleCountryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value
    let code = ''
    code = countryOptions.find((option) => option.name === country)?.code ?? ''

    setForm({ ...form, country, phone: code })
    setErrors({ ...errors, country: false })
  }

  const submitForm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Basic validation
    const newErrors: LeadErrors = {}
    const requiredFields: LeadField[] = [
      'parent_name',
      'parent_email',
      'student_name',
      'phone',
      'grade',
      'country',
      'preferred_date',
      'preferred_time',
    ]
    requiredFields.forEach((f) => {
      if (!form[f]) newErrors[f] = true
    })
    // The moment they picked, on their own clock.
    const start =
      form.preferred_date && form.preferred_time
        ? zonedTimeToMs(form.preferred_date, form.preferred_time, zone)
        : null
    if (start !== null && start < Date.now() + NOTICE_MS) {
      newErrors.preferred_date = true
      newErrors.preferred_time = true
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }
    if (start === null) return

    setLoading(true)

    try {
      const lead = {
        parent_name: form.parent_name,
        student_name: form.student_name,
        email: form.parent_email,
        phone: form.phone,
        grade: form.grade,
        country: form.country,
        // Saved as Nairobi time, which tutors' slots and the schedule use.
        class_date: dateKeyIn(start, DEFAULT_TIME_ZONE),
        class_time: `${timeKeyIn(start, DEFAULT_TIME_ZONE)}:00`,
        lead_source: form.lead_source || 'landing_page',
        referal_code: form.referral_code,
        status: 'new',
      }
      let { error } = await supabase
        .from('leads')
        .insert([{ ...lead, time_zone: zone }])
      // Until the time zone column exists (migration 20261125120000), the
      // booking still goes through, in Nairobi time.
      if (error && error.message.includes('time_zone')) {
        const retry = await supabase.from('leads').insert([lead])
        error = retry.error
      }

      setLoading(false)

      if (!error) {
        // A trial booked into a tutor's slot gets its class link by email.
        sendWaitingInvites()
        setBooked({ start, zone })
        setSuccess(true)
        setForm({
          parent_name: '',
          parent_email: '',
          student_name: '',
          phone: '',
          grade: '',
          preferred_date: '',
          preferred_time: '',
          country: '',
          lead_source: 'landing_page',
          referral_code: '',
        })
      } else {
        console.error(error)
        alert('Something went wrong. Try again.')
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
      alert('Something went wrong. Try again.')
    }
  }

  const grades = [
    'K',
    ...Array.from({ length: 12 }, (_, i) => (i + 1).toString()),
  ]

  // What the picked time is in Nairobi, where the tutors are.
  const picked =
    form.preferred_date && form.preferred_time
      ? zonedTimeToMs(form.preferred_date, form.preferred_time, zone)
      : null
  const tutorTime =
    picked !== null && !sameClock(picked, zone, DEFAULT_TIME_ZONE)
      ? dateTimeIn(picked, DEFAULT_TIME_ZONE)
      : null
  // Both marked by submit when the time was too soon (or missing).
  const timeProblem = Boolean(errors.preferred_date && errors.preferred_time)

  const baseInputClass =
    'w-full border rounded-xl px-4 py-3 outline-hidden transition-all duration-300 focus:ring-2 focus:ring-purple-400 focus:shadow-lg focus:shadow-purple-300/30'

  const getInputClass = (name: LeadField) =>
    `${baseInputClass} ${errors[name] ? 'border-red-500' : 'border-purple-400'}`

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-gray-50 px-6 py-12 md:px-20">
      {/* LOGO */}
      <div className="absolute top-6 left-6 z-50 md:top-8 md:left-12">
        <img src="/TechTalkBrand.png" alt="Logo" className="h-12 md:h-14" />
      </div>

      {/* HEADER */}
      <div className="relative z-50 mt-6 mb-8 text-center md:mt-0">
        <h1 className="text-3xl leading-tight font-extrabold text-gray-900 md:text-4xl">
          Give Your Child a Confident Start in Coding 🚀
        </h1>
        <p className="mt-2 text-gray-600">
          Book a free 1-on-1 coding trial with a certified tutor.
        </p>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex w-full max-w-6xl flex-col items-center gap-12 md:flex-row">
        {/* LEFT IMAGE */}
        <div className="relative mb-10 flex w-full justify-center md:mb-0 md:w-1/2">
          <div className="animate-rotate-slow absolute -top-24 -left-24 h-96 w-96 rounded-full bg-linear-to-tr from-blue-400 via-purple-400 to-pink-400 opacity-60" />
          <div className="animate-rotate-slow reverse absolute -right-16 -bottom-16 h-72 w-72 rounded-full bg-linear-to-br from-purple-300 via-pink-300 to-yellow-200 opacity-50" />

          <img
            src="/girl-code.png"
            alt="Child coding"
            className="relative z-50 w-80 rounded-3xl object-cover shadow-2xl md:w-md lg:w-lg"
          />
        </div>

        {/* RIGHT FORM */}
        <div className="relative w-full md:w-1/2">
          {success ? (
            <div className="rounded-3xl border border-green-200 bg-green-50 p-8 text-center">
              <h3 className="text-2xl font-bold text-green-800">
                Booking Confirmed!
              </h3>
              {booked && (
                <p className="mt-3 font-semibold text-green-800">
                  {dateTimeIn(booked.start, booked.zone)} (
                  {zonePlace(booked.zone)} time)
                </p>
              )}
              <p className="mt-2 text-green-700">
                We’ll match a tutor to that time and email you the class link.
                We may also reach out on WhatsApp.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(event) => void submitForm(event)}
              className="md:bg-opacity-50 space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-lg md:bg-transparent md:p-10 md:backdrop-blur-xs"
            >
              <input
                name="parent_name"
                placeholder="Parent name"
                value={form.parent_name}
                onChange={handleChange}
                className={getInputClass('parent_name')}
              />
              <input
                name="parent_email"
                type="email"
                placeholder="Parent email"
                value={form.parent_email}
                onChange={handleChange}
                className={getInputClass('parent_email')}
              />
              <input
                name="student_name"
                placeholder="Student name"
                value={form.student_name}
                onChange={handleChange}
                className={getInputClass('student_name')}
              />

              {/* COUNTRY + FLAG + PHONE + GRADE */}
              <div className="flex items-center gap-2">
                <div className="relative w-36">
                  {form.country && (
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xl">
                      {
                        countryOptions.find((c) => c.name === form.country)
                          ?.flag
                      }
                    </span>
                  )}
                  <select
                    name="country"
                    value={form.country}
                    onChange={handleCountryChange}
                    className={`w-full rounded-xl border px-10 py-3 outline-hidden transition-all duration-300 focus:shadow-lg focus:ring-2 focus:shadow-purple-300/30 focus:ring-purple-400 ${errors.country ? 'border-red-500' : 'border-purple-400'} bg-white`}
                  >
                    <option value="">🌍</option>
                    {countryOptions.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  name="phone"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={handleChange}
                  className={getInputClass('phone')}
                />

                <select
                  name="grade"
                  value={form.grade}
                  onChange={handleChange}
                  className={`w-24 rounded-xl border px-4 py-3 outline-hidden transition-all duration-300 focus:shadow-lg focus:ring-2 focus:shadow-purple-300/30 focus:ring-purple-400 ${errors.grade ? 'border-red-500' : 'border-purple-400'} bg-white`}
                >
                  <option value="" disabled>
                    Grade
                  </option>
                  {grades.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset className="space-y-2">
                <legend className="mb-1 text-sm font-semibold text-gray-700">
                  When suits you? Pick any day and time.
                </legend>
                <div className="flex gap-2">
                  <input
                    type="date"
                    min={today || undefined}
                    name="preferred_date"
                    aria-label="Trial date"
                    value={form.preferred_date}
                    onChange={handleChange}
                    className={`${baseInputClass} ${errors.preferred_date ? 'border-red-500' : 'border-purple-400'}`}
                  />
                  <select
                    name="preferred_time"
                    aria-label="Trial time"
                    value={form.preferred_time}
                    onChange={handleChange}
                    className={`${baseInputClass} bg-white ${errors.preferred_time ? 'border-red-500' : 'border-purple-400'}`}
                  >
                    <option value="" disabled>
                      Time
                    </option>
                    {BOOKABLE_TIMES.map((time) => (
                      <option key={time} value={time}>
                        {timeLabel(time)}
                      </option>
                    ))}
                  </select>
                </div>
                <label
                  htmlFor="book-time-zone"
                  className="block text-xs font-semibold text-gray-500"
                >
                  Your time zone
                </label>
                <TimeZoneSelect
                  id="book-time-zone"
                  value={zone}
                  onChange={setChosenZone}
                  aria-describedby="book-time-note"
                  className={`${baseInputClass} border-purple-400 bg-white text-sm`}
                />
                <p
                  id="book-time-note"
                  className={`text-xs ${timeProblem ? 'font-semibold text-red-600' : 'text-gray-500'}`}
                >
                  {timeProblem
                    ? 'Pick a day and a time at least an hour from now.'
                    : tutorTime
                      ? `That’s ${tutorTime} in Nairobi, where our tutors are.`
                      : 'Times are in your own time zone.'}
                </p>
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

      {/* TRUST / METRICS */}
      <div className="mt-16 w-full border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="mb-8 text-sm font-semibold tracking-widest text-gray-400 uppercase">
            Trusted by Parents from Top Schools
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 transition-all md:gap-16">
            <img
              src="/school1.png"
              alt="School Name"
              className="h-10 transition-transform hover:scale-105 md:h-12"
            />
            <img
              src="/school2.jpeg"
              alt="School Name"
              className="h-10 transition-transform hover:scale-105 md:h-12"
            />
            <img
              src="/school3.jpeg"
              alt="School Name"
              className="h-10 transition-transform hover:scale-105 md:h-12"
            />
            <img
              src="/tech-partner.jpeg"
              alt="Partner Name"
              className="h-10 transition-transform hover:scale-105 md:h-12"
            />
          </div>
          <div className="mt-10 flex flex-col items-center justify-center gap-8 border-t border-gray-200 pt-10 md:flex-row">
            <div className="text-center">
              <span className="block text-3xl font-bold text-gray-800">
                500+
              </span>
              <span className="text-sm text-gray-500">Active Students</span>
            </div>
            <div className="hidden h-10 w-px bg-gray-300 md:block" />
            <div className="text-center">
              <span className="block text-3xl font-bold text-gray-800">
                4.9/5
              </span>
              <span className="text-sm text-gray-500">Parent Rating</span>
            </div>
            <div className="hidden h-10 w-px bg-gray-300 md:block" />
            <div className="text-center">
              <span className="block text-3xl font-bold text-gray-800">
                12+
              </span>
              <span className="text-sm text-gray-500">Coding Courses</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
