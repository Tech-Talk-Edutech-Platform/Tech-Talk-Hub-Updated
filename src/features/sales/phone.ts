/** Countries the team books from, with their dialling codes. */
export const COUNTRIES = [
  { name: 'Kenya', code: '+254' },
  { name: 'Uganda', code: '+256' },
  { name: 'Tanzania', code: '+255' },
  { name: 'Nigeria', code: '+234' },
  { name: 'South Africa', code: '+27' },
] as const

export const DEFAULT_COUNTRY_CODE = '+254'

/**
 * "0712 345 678" with +254 → "+254712345678". Null when there are too few
 * digits to be a phone number.
 */
export function fullPhoneNumber(countryCode: string, input: string) {
  const digits = input.replace(/\D/g, '').replace(/^0/, '')
  return digits.length < 7 ? null : `${countryCode}${digits}`
}

/** "+254712345678" → "+254 712 345 678", for reading out on a call. */
export function formatPhone(phone: string) {
  const country = COUNTRIES.find(({ code }) => phone.startsWith(code))
  if (!country) return phone
  const rest = phone.slice(country.code.length)
  return `${country.code} ${rest.replace(/(\d{3})(?=\d)/g, '$1 ')}`
}
