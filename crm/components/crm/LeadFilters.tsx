import Link from 'next/link'
import { Input, Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LEAD_STATUSES } from '@/lib/format'

interface Props {
  action: string
  values: { q?: string; status?: string; source?: string; owner?: string }
  sources: string[]
  reps: { id: string; label: string }[]
  exportHref?: string
}

/** Plain GET form so filters are shareable URLs and need no client JS. */
export function LeadFilters({ action, values, sources, reps, exportHref }: Props): React.ReactElement {
  return (
    <form action={action} className="mb-6 flex flex-wrap items-end gap-2">
      <Input name="q" defaultValue={values.q} placeholder="Search name, email, company…" className="h-9 w-64" />
      <Select name="status" defaultValue={values.status ?? ''} className="h-9 w-44">
        <option value="">All stages</option>
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </Select>
      <Select name="source" defaultValue={values.source ?? ''} className="h-9 w-40">
        <option value="">All sources</option>
        {sources.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      <Select name="owner" defaultValue={values.owner ?? ''} className="h-9 w-44">
        <option value="">Any owner</option>
        <option value="none">Unassigned</option>
        {reps.map((r) => (
          <option key={r.id} value={r.id}>
            {r.label}
          </option>
        ))}
      </Select>
      <Button type="submit" size="sm">
        Filter
      </Button>
      <Link href={action} className="text-sm text-muted-foreground underline underline-offset-4">
        Reset
      </Link>
      {exportHref ? (
        <a href={exportHref} className="ml-auto text-sm underline underline-offset-4">
          Export CSV ↓
        </a>
      ) : null}
    </form>
  )
}
