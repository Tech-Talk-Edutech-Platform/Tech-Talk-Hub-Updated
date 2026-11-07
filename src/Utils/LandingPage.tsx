import { useState } from 'react'
import { supabase } from '../supabase'
import type { ChangeEvent, FormEvent } from 'react'
import { staticPageMeta } from '../data/seo'
import { usePageMeta } from '../hooks/usePageMeta'

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
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<LeadForm>({
    parent_name: '',
    parent_email: '',
    student_name: '',
    phone: '',
    grade: '',
    preferred_date: today,
    preferred_time: '00:00',
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
    if (country === 'Kenya') code = '+254'
    else if (country === 'Uganda') code = '+256'
    else if (country === 'Tanzania') code = '+255'
    else if (country === 'Nigeria') code = '+234'
    else if (country === 'South Africa') code = '+27'

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
    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.from('leads').insert([
        {
          parent_name: form.parent_name,
          student_name: form.student_name,
          email: form.parent_email,
          phone: form.phone,
          grade: form.grade,
          country: form.country,
          class_date: form.preferred_date,
          class_time:
            form.preferred_time.length === 5
              ? form.preferred_time + ':00'
              : form.preferred_time,
          lead_source: form.lead_source || 'landing_page',
          referal_code: form.referral_code,
          status: 'new',
        },
      ])

      setLoading(false)

      if (!error) {
        setSuccess(true)
        setForm({
          parent_name: '',
          parent_email: '',
          student_name: '',
          phone: '',
          grade: '',
          preferred_date: today,
          preferred_time: '00:00',
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

  const countryOptions = [
    { name: 'Kenya', code: '+254', flag: '🇰🇪' },
    { name: 'Uganda', code: '+256', flag: '🇺🇬' },
    { name: 'Tanzania', code: '+255', flag: '🇹🇿' },
    { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
    { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  ]

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
              <p className="mt-2 text-green-700">
                We’ll contact you shortly with trial details.
              </p>
            </div>
          ) : (
            <form
              onSubmit={submitForm}
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

              <div className="flex gap-2">
                <input
                  type="date"
                  min={today}
                  name="preferred_date"
                  value={form.preferred_date}
                  onChange={handleChange}
                  className={`${baseInputClass} ${errors.preferred_date ? 'border-red-500' : 'border-purple-400'}`}
                />
                <input
                  type="time"
                  step="3600" // ⏱️ 1 hour
                  name="preferred_time"
                  value={form.preferred_time}
                  onChange={handleChange}
                  className={`${baseInputClass} ${errors.preferred_time ? 'border-red-500' : 'border-purple-400'}`}
                />
              </div>

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
