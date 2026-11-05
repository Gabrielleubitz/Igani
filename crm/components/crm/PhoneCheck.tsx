'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { checkContactPhone } from '@/app/actions/leads'
import type { CallerId } from '@/lib/caller-id'
import { dialProblem, toE164 } from '@/lib/phone-numbers'

/**
 * Under a phone field: tells you when the number is already a contact (however it's typed), on a call list, or listed
 * on Google for a business, and offers that business name for the Company field.
 */
export function PhoneCheck({ phone, company, onUseCompany }: { phone: string; company: string; onUseCompany: (name: string) => void }): React.ReactElement | null {
  const e164 = toE164(phone)
  const ready = Boolean(e164 && !dialProblem(e164, ['IL', 'US']))
  const [found, setFound] = useState<{ number: string; who: CallerId | null } | null>(null)
  useEffect(() => {
    if (!ready || !e164) return
    let stale = false
    const t = window.setTimeout(async () => {
      const r = await checkContactPhone(e164)
      if (!stale && r.ok) setFound({ number: e164, who: r.data })
    }, 400)
    return () => {
      stale = true
      window.clearTimeout(t)
    }
  }, [e164, ready])
  const who = found && found.number === e164 ? found.who : null
  if (!ready || !who?.title) return null

  if (who.lead)
    return (
      <p role="status" className="col-span-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-100 ring-1 ring-amber-500/30">
        <span className="font-semibold">Already in the CRM:</span> {who.title}
        {who.subtitle ? <span className="text-amber-100/70"> · {who.subtitle}</span> : null}
        {who.lead.id ? (
          <>
            {' '}
            <Link href={`/sales/leads/${who.lead.id}`} className="font-medium underline underline-offset-2">
              Open contact
            </Link>
          </>
        ) : null}
      </p>
    )
  const business = who.prospect?.name ?? who.label?.company ?? null
  return (
    <p role="status" className="col-span-2 rounded-lg bg-sky-500/10 px-3 py-2 text-xs text-sky-100 ring-1 ring-sky-500/25">
      {who.prospect ? 'On your call list' : 'Google lists this number for'}: <span className="font-semibold">{who.title}</span>
      {who.subtitle ? <span className="text-sky-100/70"> · {who.subtitle}</span> : null}
      {business && business !== company.trim() ? (
        <>
          {' '}
          <button type="button" onClick={() => onUseCompany(business)} className="font-medium underline underline-offset-2">
            Use as company
          </button>
        </>
      ) : null}
    </p>
  )
}
