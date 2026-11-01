'use client'

import { useEffect, useState } from 'react'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { localDateKey } from '@/lib/time'

/** Date + time picker (21st.dev delivery-scheduler style). Emits "YYYY-MM-DDTHH:mm" once a date and time are chosen, otherwise "". */
export function DateTimeField({ idPrefix, onChange, timeZone }: { idPrefix: string; onChange: (value: string) => void; /** The person's profile time zone: "today" and the chosen time are read in it */ timeZone: string }): React.ReactElement {
  const [value, setValue] = useState('')
  useEffect(() => {
    onChange(value.length === 16 ? value : '')
  }, [value, onChange])
  return <DateTimePicker timeZone={timeZone} id={`${idPrefix}-day`} aria-label="Date and time" min={localDateKey(new Date(), timeZone)} value={value} onChange={setValue} />
}
