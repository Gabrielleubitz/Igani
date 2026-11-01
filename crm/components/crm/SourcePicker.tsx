'use client'

import { useState } from 'react'
import { Input, Select } from '@/components/ui/input'
import { LEAD_SOURCES } from '@/lib/format'

const CUSTOM = '__custom__'

/**
 * "Where did this contact come from?" — a preset list plus "Something else…" for free text,
 * and a detail line (which page, campaign, or who referred them). Submits as `source` and `sourceDetail`.
 * Sources that came in automatically (e.g. "igani.co contact form") are kept and shown as an option.
 */
export function SourcePicker({ defaultSource, defaultDetail, idPrefix = 'src', compact = false }: { defaultSource?: string | null; defaultDetail?: string | null; idPrefix?: string; compact?: boolean }): React.ReactElement {
  const presets: readonly string[] = LEAD_SOURCES
  const initial = defaultSource ?? ''
  const isKnown = !initial || presets.includes(initial)
  const [choice, setChoice] = useState(initial)
  const [custom, setCustom] = useState('')
  const options = isKnown ? presets : [initial, ...presets]
  const lab = compact ? 'space-y-1 text-xs text-muted-foreground' : 'space-y-1 text-sm font-medium'
  return (
    <div className="col-span-2 grid gap-2 sm:grid-cols-2">
      <label className={lab} htmlFor={`${idPrefix}-source`}>
        Came from
        <Select id={`${idPrefix}-source`} value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Choose a source…</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value={CUSTOM}>Something else…</option>
        </Select>
      </label>
      {choice === CUSTOM ? (
        <label className={lab} htmlFor={`${idPrefix}-custom`}>
          Source name
          <Input id={`${idPrefix}-custom`} required maxLength={100} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Podcast, Newsletter" autoFocus />
        </label>
      ) : null}
      <input type="hidden" name="source" value={choice === CUSTOM ? custom : choice} />
      <label className={`${lab} ${choice === CUSTOM ? 'sm:col-span-2' : ''}`} htmlFor={`${idPrefix}-detail`}>
        Details (optional)
        <Input id={`${idPrefix}-detail`} name="sourceDetail" maxLength={300} defaultValue={defaultDetail ?? ''} placeholder="Page, campaign, or who referred them" />
      </label>
    </div>
  )
}
