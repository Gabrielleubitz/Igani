'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { updateLead } from '@/app/actions/leads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  leadId: string
  initial: { firstName: string | null; lastName: string | null; phone: string | null; company: string | null; website: string | null; budget: string | null; dealValue: number | null; tags: string[] }
}

/** Editable contact details for the 360 profile; open to every role. */
export function EditContactForm({ leadId, initial }: Props): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <form
      className="grid grid-cols-2 gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const s = (k: string): string => String(fd.get(k) ?? '')
        const value = s('dealValue').trim()
        start(async () => {
          const res = await updateLead(leadId, {
            firstName: s('firstName'),
            lastName: s('lastName'),
            phone: s('phone'),
            company: s('company'),
            website: s('website'),
            budget: s('budget'),
            dealValue: value ? Number(value) : null,
            tags: s('tags').split(',').filter((t) => t.trim()),
          })
          setMsg(res.ok ? 'Saved.' : res.error)
          router.refresh()
        })
      }}
    >
      <Input name="firstName" aria-label="First name" placeholder="First name" defaultValue={initial.firstName ?? ''} />
      <Input name="lastName" aria-label="Last name" placeholder="Last name" defaultValue={initial.lastName ?? ''} />
      <Input name="company" aria-label="Company" placeholder="Company" defaultValue={initial.company ?? ''} />
      <Input name="phone" aria-label="Phone" placeholder="Phone" defaultValue={initial.phone ?? ''} />
      <Input name="website" aria-label="Website" placeholder="Website" defaultValue={initial.website ?? ''} />
      <Input name="budget" aria-label="Budget" placeholder="Budget" defaultValue={initial.budget ?? ''} />
      <Input name="dealValue" aria-label="Deal value" type="number" min={0} placeholder="Deal value" defaultValue={initial.dealValue ?? ''} />
      <Input name="tags" aria-label="Tags" placeholder="Tags (comma separated)" defaultValue={initial.tags.join(', ')} />
      <div className="col-span-2 flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          Save
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  )
}
