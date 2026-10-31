'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input, Select } from '@/components/ui/input'
import { resolveYear } from '@/lib/date-field'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const pad = (n: number): string => String(n).padStart(2, '0')

/**
 * Day + month + time, with no year to type: the day and month start on today, and the year is always the
 * current one (or next year once that date has already passed this year). Emits "YYYY-MM-DDTHH:mm" once a time is set.
 */
export function DateTimeField({ idPrefix, onChange }: { idPrefix: string; onChange: (value: string) => void }): React.ReactElement {
  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(today.getMonth())
  const [day, setDay] = useState(today.getDate())
  const [time, setTime] = useState('')

  // This year, unless that day has already gone by: then it means next year.
  const year = useMemo(() => resolveYear(today, month, day), [today, month, day])
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const safeDay = Math.min(day, daysInMonth)

  useEffect(() => {
    onChange(time ? `${year}-${pad(month + 1)}-${pad(safeDay)}T${time}` : '')
  }, [time, year, month, safeDay, onChange])

  return (
    <div className="flex gap-2">
      <Select aria-label="Day" id={`${idPrefix}-day`} className="w-20" value={safeDay} onChange={(e) => setDay(Number(e.target.value))}>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
      <Select aria-label="Month" className="min-w-0 flex-1" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
        {MONTHS.map((m, i) => (
          <option key={m} value={i}>
            {m}
          </option>
        ))}
      </Select>
      <Input aria-label="Time" id={`${idPrefix}-time`} type="time" required className="w-32" value={time} onChange={(e) => setTime(e.target.value)} />
    </div>
  )
}
