'use client'

import { useMemo } from 'react'
import { Select } from '@/components/ui/input'

const FALLBACK_ZONES = ['UTC', 'Asia/Jerusalem', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Asia/Dubai']

/** Every IANA time zone in a dropdown (the browser supplies the list). */
export function TimeZoneSelect({ id, value, onChange, className }: { id?: string; value: string; onChange: (zone: string) => void; className?: string }): React.ReactElement {
  const zones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : FALLBACK_ZONES
    return list.includes(value) ? list : [value, ...list]
  }, [value])
  return (
    <Select id={id} required value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      {zones.map((z) => (
        <option key={z} value={z}>
          {z.replaceAll('_', ' ')}
        </option>
      ))}
    </Select>
  )
}
