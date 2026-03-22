'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type CountryDialEntry = {
  code: string
  flag: string
  name: string
  /** Mock local format hint for the placeholder (no country prefix). */
  example: string
}

export const COUNTRY_CODES: CountryDialEntry[] = [
  { code: '+972', flag: '🇮🇱', name: 'Israel', example: '50 123 4567' },
  { code: '+1', flag: '🇺🇸', name: 'United States', example: '(555) 123-4567' },
  { code: '+1', flag: '🇨🇦', name: 'Canada', example: '416 555 1234' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom', example: '7700 900123' },
  { code: '+33', flag: '🇫🇷', name: 'France', example: '6 12 34 56 78' },
  { code: '+49', flag: '🇩🇪', name: 'Germany', example: '151 23456789' },
  { code: '+39', flag: '🇮🇹', name: 'Italy', example: '312 345 6789' },
  { code: '+34', flag: '🇪🇸', name: 'Spain', example: '612 34 56 78' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands', example: '6 1234 5678' },
  { code: '+41', flag: '🇨🇭', name: 'Switzerland', example: '79 123 45 67' },
  { code: '+43', flag: '🇦🇹', name: 'Austria', example: '664 1234567' },
  { code: '+32', flag: '🇧🇪', name: 'Belgium', example: '470 12 34 56' },
  { code: '+48', flag: '🇵🇱', name: 'Poland', example: '512 345 678' },
  { code: '+7', flag: '🇷🇺', name: 'Russia', example: '912 345-67-89' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine', example: '50 123 4567' },
  { code: '+90', flag: '🇹🇷', name: 'Turkey', example: '532 123 45 67' },
  { code: '+20', flag: '🇪🇬', name: 'Egypt', example: '100 123 4567' },
  { code: '+971', flag: '🇦🇪', name: 'UAE', example: '50 123 4567' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', example: '50 123 4567' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan', example: '7 9012 3456' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon', example: '3 123 456' },
  { code: '+970', flag: '🇵🇸', name: 'Palestine', example: '599 123 456' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait', example: '512 34567' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar', example: '3312 3456' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain', example: '3612 3456' },
  { code: '+968', flag: '🇴🇲', name: 'Oman', example: '9212 3456' },
  { code: '+91', flag: '🇮🇳', name: 'India', example: '98765 43210' },
  { code: '+86', flag: '🇨🇳', name: 'China', example: '138 0013 8000' },
  { code: '+81', flag: '🇯🇵', name: 'Japan', example: '90-1234-5678' },
  { code: '+82', flag: '🇰🇷', name: 'South Korea', example: '10-1234-5678' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil', example: '11 91234-5678' },
  { code: '+52', flag: '🇲🇽', name: 'Mexico', example: '55 1234 5678' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina', example: '11 2345-6789' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia', example: '300 123 4567' },
  { code: '+61', flag: '🇦🇺', name: 'Australia', example: '412 345 678' },
  { code: '+64', flag: '🇳🇿', name: 'New Zealand', example: '21 123 4567' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa', example: '82 123 4567' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria', example: '802 123 4567' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya', example: '712 345678' },
]

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

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value)
    setCountryIndex(idx)
    const nextCode = COUNTRY_CODES[idx].code
    onChange(`${nextCode} ${local}`.trim())
  }

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, spaces, hyphens, parentheses
    const cleaned = e.target.value.replace(/[^\d\s\-()]/g, '')
    setLocal(cleaned)
    onChange(`${countryCode} ${cleaned}`.trim())
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
