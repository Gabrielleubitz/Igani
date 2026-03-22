'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type CountryDialEntry = {
  code: string
  flag: string
  name: string
  /** Mock local format hint for the placeholder (no country prefix). */
  example: string
  /**
   * Input mask: `#` = digit slot; other characters are shown as-typed spacing/punctuation.
   * Must match the visual pattern of `example`.
   */
  mask: string
}

export const COUNTRY_CODES: CountryDialEntry[] = [
  { code: '+972', flag: '🇮🇱', name: 'Israel', example: '50 123 4567', mask: '## ### ####' },
  { code: '+1', flag: '🇺🇸', name: 'United States', example: '(555) 123-4567', mask: '(###) ###-####' },
  { code: '+1', flag: '🇨🇦', name: 'Canada', example: '416 555 1234', mask: '### ### ####' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom', example: '7700 900123', mask: '#### ######' },
  { code: '+33', flag: '🇫🇷', name: 'France', example: '6 12 34 56 78', mask: '# ## ## ## ##' },
  { code: '+49', flag: '🇩🇪', name: 'Germany', example: '151 23456789', mask: '### ########' },
  { code: '+39', flag: '🇮🇹', name: 'Italy', example: '312 345 6789', mask: '### ### ####' },
  { code: '+34', flag: '🇪🇸', name: 'Spain', example: '612 34 56 78', mask: '### ## ## ##' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands', example: '6 1234 5678', mask: '# #### ####' },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland', example: '79 123 45 67', mask: '## ### ## ##' },
  { code: '+43', flag: '🇦🇹', name: 'Austria', example: '664 1234567', mask: '### #######' },
  { code: '+32', flag: '🇧🇪', name: 'Belgium', example: '470 12 34 56', mask: '### ## ## ##' },
  { code: '+48', flag: '🇵🇱', name: 'Poland', example: '512 345 678', mask: '### ### ###' },
  { code: '+7', flag: '🇷🇺', name: 'Russia', example: '912 345-67-89', mask: '### ###-##-##' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine', example: '50 123 4567', mask: '## ### ####' },
  { code: '+90', flag: '🇹🇷', name: 'Turkey', example: '532 123 45 67', mask: '### ### ## ##' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt', example: '100 123 4567', mask: '### ### ####' },
  { code: '+971', flag: '🇦🇪', name: 'UAE', example: '50 123 4567', mask: '## ### ####' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', example: '50 123 4567', mask: '## ### ####' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan', example: '7 9012 3456', mask: '# #### ####' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon', example: '3 123 456', mask: '# ### ###' },
  { code: '+970', flag: '🇵🇸', name: 'Palestine', example: '599 123 456', mask: '### ### ###' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait', example: '512 34567', mask: '### #####' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar', example: '3312 3456', mask: '#### ####' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain', example: '3612 3456', mask: '#### ####' },
  { code: '+968', flag: '🇴🇲', name: 'Oman', example: '9212 3456', mask: '#### ####' },
  { code: '+91', flag: '🇮🇳', name: 'India', example: '98765 43210', mask: '##### #####' },
  { code: '+86', flag: '🇨🇳', name: 'China', example: '138 0013 8000', mask: '### #### ####' },
  { code: '+81', flag: '🇯🇵', name: 'Japan', example: '90-1234-5678', mask: '##-####-####' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea', example: '10-1234-5678', mask: '##-####-####' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil', example: '11 91234-5678', mask: '## #####-####' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico', example: '55 1234 5678', mask: '## #### ####' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina', example: '11 2345-6789', mask: '## ####-####' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia', example: '300 123 4567', mask: '### ### ####' },
  { code: '+61', flag: '🇦🇺', name: 'Australia', example: '412 345 678', mask: '### ### ###' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand', example: '21 123 4567', mask: '## ### ####' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa', example: '82 123 4567', mask: '## ### ####' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria', example: '802 123 4567', mask: '### ### ####' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya', example: '712 345678', mask: '### ######' },
]

/** Count of digit slots in a mask. */
export function maskDigitCount(mask: string): number {
  return (mask.match(/#/g) || []).length
}

/**
 * Formats digits to match the mask (e.g. US `(###) ###-####`).
 * Stops when digits are exhausted; leading literals (e.g. `(`) appear once digits exist.
 */
export function formatLocalWithMask(digitsOnly: string, mask: string): string {
  const d = digitsOnly.replace(/\D/g, '')
  if (!d) return ''
  let out = ''
  let di = 0
  for (let mi = 0; mi < mask.length && di < d.length; mi++) {
    if (mask[mi] === '#') {
      out += d[di++]
    } else {
      out += mask[mi]
    }
  }
  return out
}

/** Returns true if the local number looks real (not 1234567, 0000000, etc.) */
export function validatePhone(localNumber: string): boolean {
  const digits = localNumber.replace(/\D/g, '')
  if (digits.length < 7 || digits.length > 13) return false
  // All same digits
  if (/^(\d)\1+$/.test(digits)) return false
  // Obviously sequential ascending/descending
  const asc = '01234567890123456789'
  const desc = '09876543210987654321'
  if (asc.includes(digits) || desc.includes(digits)) return false
  return true
}

interface PhoneInputProps {
  value: string          // full value e.g. "+972 501234567"
  onChange: (full: string) => void
  error?: string
  required?: boolean
  inputClassName?: string
  label?: string
}

export default function PhoneInput({
  value,
  onChange,
  error,
  required,
  inputClassName = '',
  label = 'Phone Number',
}: PhoneInputProps) {
  const [countryIndex, setCountryIndex] = useState(0)
  const [local, setLocal] = useState('')

  const country = COUNTRY_CODES[countryIndex]
  const countryCode = country.code
  const placeholder = country.example
  const mask = country.mask
  const maxDigits = maskDigitCount(mask)

  const applyDigits = (digitsRaw: string) => {
    const capped = digitsRaw.replace(/\D/g, '').slice(0, maxDigits)
    return formatLocalWithMask(capped, mask)
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value)
    setCountryIndex(idx)
    const nextMask = COUNTRY_CODES[idx].mask
    const digits = local.replace(/\D/g, '')
    const capped = digits.slice(0, maskDigitCount(nextMask))
    const formatted = formatLocalWithMask(capped, nextMask)
    setLocal(formatted)
    const nextCode = COUNTRY_CODES[idx].code
    onChange(`${nextCode} ${formatted}`.trim())
  }

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = applyDigits(e.target.value)
    setLocal(formatted)
    onChange(`${countryCode} ${formatted}`.trim())
  }

  const isInvalid = local.length > 0 && !validatePhone(local)

  return (
    <div>
      <label className="block text-sm font-semibold text-white mb-2">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className={`flex rounded-lg overflow-hidden border transition-all duration-300 ${
        isInvalid
          ? 'border-red-500 ring-2 ring-red-500/30'
          : 'border-slate-600 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500'
      }`}>
        {/* Country code dropdown */}
        <div className="relative flex-shrink-0">
          <select
            value={countryIndex}
            onChange={handleCountryChange}
            className="appearance-none h-full pl-3 pr-7 py-3 bg-slate-800 text-white text-sm cursor-pointer focus:outline-none border-r border-slate-600"
            style={{ minWidth: '88px' }}
          >
            {COUNTRY_CODES.map((c, i) => (
              <option key={`${c.code}-${c.name}-${i}`} value={i}>
                {c.flag} {c.code}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>
        {/* Local number */}
        <input
          type="tel"
          value={local}
          onChange={handleLocalChange}
          placeholder={placeholder}
          dir="ltr"
          required={required}
          className={`flex-1 px-4 py-3 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none ${inputClassName}`}
        />
      </div>
      {isInvalid && (
        <p className="mt-1 text-xs text-red-400">Please enter a valid phone number.</p>
      )}
      {error && !isInvalid && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
