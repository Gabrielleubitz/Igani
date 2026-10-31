'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createLead } from '@/app/actions/leads'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

export function NewLeadForm(): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string; id?: string } | null>(null)
  return (
    <form
      className="grid grid-cols-2 gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const fd = new FormData(form)
        const get = (k: string): string | undefined => String(fd.get(k) ?? '').trim() || undefined
        start(async () => {
          const res = await createLead({
            email: String(fd.get('email') ?? ''),
            firstName: get('firstName'),
            lastName: get('lastName'),
            company: get('company'),
            phone: get('phone'),
            tags: (get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
          })
          setMsg(res.ok ? { ok: true, text: '✓ Contact added.', id: res.data.id } : { ok: false, text: res.error })
          if (res.ok) form.reset()
          router.refresh()
        })
      }}
    >
      <div className="col-span-2 space-y-1">
        <Label htmlFor="nl-email">Email *</Label>
        <Input id="nl-email" name="email" type="email" required placeholder="name@company.com" autoFocus />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nl-first">First name</Label>
        <Input id="nl-first" name="firstName" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nl-last">Last name</Label>
        <Input id="nl-last" name="lastName" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nl-company">Company</Label>
        <Input id="nl-company" name="company" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nl-phone">Phone</Label>
        <Input id="nl-phone" name="phone" type="tel" />
      </div>
      <div className="col-span-2 space-y-1">
        <Label htmlFor="nl-tags">Tags</Label>
        <Input id="nl-tags" name="tags" placeholder="e.g. referral, ecommerce (comma separated)" />
      </div>
      <div className="col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Adding…' : 'Add contact'}
        </Button>
        {msg ? (
          <span className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
            {msg.text}{' '}
            {msg.id ? (
              <Link href={`/sales/leads/${msg.id}`} className="font-medium underline underline-offset-4">
                Open contact →
              </Link>
            ) : null}
          </span>
        ) : null}
      </div>
    </form>
  )
}
