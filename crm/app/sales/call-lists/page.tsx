import { ListChecks } from 'lucide-react'
import Link from 'next/link'
import { ImportCallListCsv } from '@/components/crm/ImportCallListCsv'
import { PageIntro } from '@/components/PageIntro'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { requireUser } from '@/lib/auth'
import { OPEN_PROSPECT, listScope } from '@/lib/call-lists'
import { formatDateTime } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Call lists' }
export const dynamic = 'force-dynamic'

/** Businesses to cold-call, list by list. Salespeople see their own lists; admins see everyone's. */
export default async function CallListsPage(): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const [lists, me] = await Promise.all([
    prisma.callList.findMany({
      where: listScope(user),
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true, query: true, ownerId: true, createdAt: true, owner: { select: { name: true, email: true } }, prospects: { select: { status: true } } },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Call lists" hint="Businesses to call. Call them from the dialer’s Lists tab; when a call goes well, pick “Interested” and the business becomes your lead." />
        <div className="flex flex-wrap gap-2">
          <ImportCallListCsv />
          <Link href="/sales/leads" className={buttonVariants({ variant: 'outline' })}>
            Find businesses
          </Link>
        </div>
      </div>
      {lists.length === 0 ? (
        <EmptyState title="No call lists yet" description="On the Leads page, use Find businesses to search Google Maps (e.g. real estate in Jerusalem) and put the results on a call list." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((l) => {
            const total = l.prospects.length
            const open = l.prospects.filter((p) => OPEN_PROSPECT.includes(p.status)).length
            const won = l.prospects.filter((p) => p.status === 'CONVERTED').length
            const lost = total - open - won
            const pct = (n: number): string => `${total ? (n / total) * 100 : 0}%`
            return (
              <li key={l.id}>
                <Link href={`/sales/call-lists/${l.id}`} className="block h-full rounded-xl border bg-card p-4 transition hover:border-primary/50">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-primary">
                      <ListChecks className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div dir="auto" className="truncate font-semibold">{l.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[user.role === 'ADMIN' ? (l.ownerId === user.id ? 'You' : l.owner ? (l.owner.name ?? l.owner.email) : 'Nobody') : null, formatDateTime(l.createdAt, me.timeZone)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="bg-emerald-500" style={{ width: pct(won) }} />
                    <span className="bg-muted-foreground/40" style={{ width: pct(lost) }} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>
                      <span className="font-semibold tabular-nums text-foreground">{open}</span> to call
                    </span>
                    <span>
                      <span className="font-semibold tabular-nums text-emerald-400">{won}</span> became leads
                    </span>
                    <span>
                      <span className="tabular-nums">{lost}</span> not a fit
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
