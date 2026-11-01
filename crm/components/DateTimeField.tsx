'use client'

import { useEffect, useState } from 'react'
import { DateTimePicker } from '@/components/ui/date-time-picker'

const pad = (n: number): string => String(n).padStart(2, '0')
const todayIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Date + time picker (21st.dev delivery-scheduler style). Emits "YYYY-MM-DDTHH:mm" once a date and time are chosen, otherwise "". */
export function DateTimeField({ idPrefix, onChange }: { idPrefix: string; onChange: (value: string) => void }): React.ReactElement {
  const [value, setValue] = useState('')
  useEffect(() => {
    onChange(value.length === 16 ? value : '')
  }, [value, onChange])
  return <DateTimePicker id={`${idPrefix}-day`} aria-label="Date and time" min={todayIso()} value={value} onChange={setValue} />
}
