'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createLead } from '@/app/actions/leads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function NewLeadForm(): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        const form = e.currentTarget
        const fd = new FormData(form)
        const get = (k: string): string | undefined => String(fd.get(k) ?? '') || undefined
        start(async () => {
          const res = await createLead({ email: String(fd.get('email') ?? ''), firstName: get('firstName'), lastName: get('lastName'), company: get('company'), phone: get('phone') })
          setMsg(res.ok ? 'Lead added.' : res.error)
          if (res.ok) form.reset()
          router.refresh()
        })
      }}
    >
      <Input name="email" type="email" required placeholder="Email" className="w-64" />
      <Input name="firstName" placeholder="First name" className="w-36" />
      <Input name="lastName" placeholder="Last name" className="w-36" />
      <Input name="company" placeholder="Company" className="w-44" />
      <Input name="phone" placeholder="Phone" className="w-36" />
      <Button type="submit" disabled={pending}>
        Add lead
      </Button>
      {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
    </form>
  )
}
