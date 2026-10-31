'use client'

import { Select } from '@/components/ui/input'

/** Pick people from a dropdown; the chosen ones show as removable chips. */
export function TeammatePicker({ teammates, value, onChange, exclude }: { teammates: { id: string; label: string }[]; value: string[]; onChange: (ids: string[]) => void; exclude?: string }): React.ReactElement {
  return (
    <div className="space-y-2">
      <Select
        aria-label="Add a teammate"
        value=""
        onChange={(e) => {
          const id = e.target.value
          if (id && !value.includes(id)) onChange([...value, id])
        }}
      >
        <option value="">{value.length > 0 ? 'Add another teammate…' : 'Select a teammate…'}</option>
        {teammates
          .filter((t) => t.id !== exclude && !value.includes(t.id))
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
      </Select>
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-sm">
              {teammates.find((t) => t.id === id)?.label ?? id}
              <button type="button" aria-label="Remove teammate" className="text-muted-foreground hover:text-foreground" onClick={() => onChange(value.filter((x) => x !== id))}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
