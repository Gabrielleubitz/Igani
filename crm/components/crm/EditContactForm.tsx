'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { updateLead } from '@/app/actions/leads'
import { SourcePicker } from '@/components/crm/SourcePicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  leadId: string
  initial: {
    email: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    company: string | null
    website: string | null
    budget: string | null
    dealValue: number | null
    tags: string[]
    source: string
    sourceDetail: string | null
  }
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }): React.ReactElement {
  return <label className={`space-y-1 text-xs text-muted-foreground ${wide ? 'col-span-2' : ''}`}>{label}{children}</label>
}

/** Editable contact details for the contact page; open to every role that can see the contact. */
export function EditContactForm({ leadId, initial }: Props): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
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
            email: s('email'),
            firstName: s('firstName'),
            lastName: s('lastName'),
            phone: s('phone'),
            company: s('company'),
            website: s('website'),
            budget: s('budget'),
            dealValue: value ? Number(value) : null,
            tags: s('tags').split(',').filter((t) => t.trim()),
            source: s('source') || undefined,
            sourceDetail: s('sourceDetail'),
          })
          setMsg(res.ok ? { ok: true, text: '✓ Saved.' } : { ok: false, text: res.error })
          router.refresh()
        })
      }}
    >
      <Field label="First name">
        <Input name="firstName" defaultValue={initial.firstName ?? ''} />
      </Field>
      <Field label="Last name">
        <Input name="lastName" defaultValue={initial.lastName ?? ''} />
      </Field>
      <Field label="Email" wide>
        <Input name="email" type="email" defaultValue={initial.email ?? ''} placeholder="name@company.com" />
      </Field>
      <Field label="Phone">
        <Input name="phone" type="tel" defaultValue={initial.phone ?? ''} />
      </Field>
      <Field label="Company">
        <Input name="company" defaultValue={initial.company ?? ''} />
      </Field>
      <Field label="Website">
        <Input name="website" defaultValue={initial.website ?? ''} />
      </Field>
      <Field label="Budget">
        <Input name="budget" defaultValue={initial.budget ?? ''} />
      </Field>
      <SourcePicker defaultSource={initial.source} defaultDetail={initial.sourceDetail} idPrefix={`edit-${leadId}`} compact />
      <Field label="Deal value">
        <Input name="dealValue" type="number" min={0} defaultValue={initial.dealValue ?? ''} />
      </Field>
      <Field label="Tags (comma separated)">
        <Input name="tags" defaultValue={initial.tags.join(', ')} />
      </Field>
      <div className="col-span-2 flex items-center gap-3 pt-1">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {msg ? <span className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</span> : null}
      </div>
    </form>
  )
}
