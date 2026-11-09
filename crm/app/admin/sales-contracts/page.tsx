import Link from 'next/link'
import { CompanyDetailsCard } from '@/components/admin/CompanyDetailsCard'
import { listSignatures } from '@/lib/signatures'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { listPendingLinks } from '@/lib/sales-contract'
import { CONTRACT_VERSION } from '@/lib/sales-contract-core'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Contract setup' }
export const dynamic = 'force-dynamic'

/**
 * Set up once: the company details and the admins' signatures. The agreement itself is sent from each salesperson's own page,
 * so one person's contract never replaces another's. This page shows where everyone stands.
 */
export default async function SalesContractsPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const company = await getSetting('contract.company')
  const [admins, reps, pending] = await Promise.all([
    listSignatures(),
    prisma.user.findMany({ where: { role: 'SALES' }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } }),
    listPendingLinks(),
  ])
  const emails = reps.map((r) => r.email?.toLowerCase()).filter((e): e is string => !!e)
  const accepted = await prisma.agreementAcceptance.findMany({ where: { email: { in: emails } }, orderBy: { signedAt: 'desc' }, select: { email: true, version: true, signedAt: true } })
  const latest = new Map<string, { version: string; signedAt: Date }>()
  for (const a of accepted) if (!latest.has(a.email)) latest.set(a.email, a)
  return (
    <div className="space-y-5">
      <PageIntro title="Contract setup" hint="Set up the company details and the signatures once. Each salesperson's agreement is sent from their own page, so one person's contract never replaces another's. Signed PDFs are emailed to you and to them and are not stored here." />
      <CompanyDetailsCard company={company} />
      <Card>
        <CardHeader>
          <CardTitle>Signatures</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Agreements are signed with a saved signature, picked when you send one. Add, edit or choose the default in{' '}
            <Link href="/admin/settings#signatures" className="text-primary underline-offset-2 hover:underline">
              Settings → Signatures
            </Link>
            .
          </p>
          <div className="flex flex-wrap gap-2">
            {admins.map((s) => (
              <span key={s.id} className="flex items-center gap-2 rounded-lg border px-2 py-1 text-sm">
                <span className="flex h-8 w-14 items-center justify-center rounded bg-white p-0.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a data URL */}
                  <img src={s.image} alt="" className="max-h-full max-w-full object-contain" />
                </span>
                {s.label}
                {s.isDefault ? <span className="text-xs text-primary">default</span> : null}
              </span>
            ))}
            {!admins.length ? <span className="text-sm text-amber-400">No signatures yet.</span> : null}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Salespeople</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0 text-sm">
          {reps.length === 0 ? <p className="p-4 text-muted-foreground">No salespeople yet.</p> : null}
          {reps.map((r) => {
            const email = r.email?.toLowerCase() ?? ''
            const a = latest.get(email)
            const open = pending.find((p) => p.email === email)
            const status =
              a?.version === CONTRACT_VERSION ? (
                <span className="text-emerald-400">Signed on {a.signedAt.toLocaleDateString('en-GB')}</span>
              ) : open ? (
                <span className="text-amber-300">Link sent, open until {open.expiresAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              ) : (
                <span className="text-muted-foreground">{a ? 'Signed an older version' : 'Not sent yet'}</span>
              )
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.name ?? r.email}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {status}
                  <Link href={`/admin/team/${r.id}#agreement`} className="rounded-md border px-3 py-1.5 hover:bg-muted">
                    {open ? 'Open their contract' : 'Send contract'}
                  </Link>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
