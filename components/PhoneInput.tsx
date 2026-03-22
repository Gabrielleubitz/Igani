'use client'

import { useState, useRef } from 'react'
import { ChevronDown } from 'lucide-react'

export const COUNTRY_CODES = [
  { code: '+972', flag: '🇮🇱', name: 'Israel' },
  { code: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: '+41',  flag: '🇨🇭', name: 'Switzerland' },
  { code: '+43',  flag: '🇦🇹', name: 'Austria' },
  { code: '+32',  flag: '🇧🇪', name: 'Belgium' },
  { code: '+48',  flag: '🇵🇱', name: 'Poland' },
  { code: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: '+380', flag: '🇺🇦', name: 'Ukraine' },
  { code: '+90',  flag: '🇹🇷', name: 'Turkey' },
  { code: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+962', flag: '🇯🇴', name: 'Jordan' },
  { code: '+961', flag: '🇱🇧', name: 'Lebanon' },
  { code: '+970', flag: '🇵🇸', name: 'Palestine' },
  { code: '+965', flag: '🇰🇼', name: 'Kuwait' },
  { code: '+974', flag: '🇶🇦', name: 'Qatar' },
  { code: '+973', flag: '🇧🇭', name: 'Bahrain' },
  { code: '+968', flag: '🇴🇲', name: 'Oman' },
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
  { code: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
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
  const [countryCode, setCountryCode] = useState('+972')
  const [local, setLocal] = useState('')

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCountryCode(e.target.value)
    onChange(`${e.target.value} ${local}`.trim())
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
            value={countryCode}
            onChange={handleCountryChange}
            className="appearance-none h-full pl-3 pr-7 py-3 bg-slate-800 text-white text-sm cursor-pointer focus:outline-none border-r border-slate-600"
            style={{ minWidth: '88px' }}
          >
            {COUNTRY_CODES.map((c, i) => (
              <option key={`${c.code}-${c.name}-${i}`} value={c.code}>
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
          placeholder="50 123 4567"
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
