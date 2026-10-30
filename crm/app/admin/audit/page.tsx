import type { EntityType } from '@prisma/client'
import { EntityType as EntityTypes } from '@prisma/client'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Audit log' }

export default async function AuditPage({ searchParams }: { searchParams: { type?: string; entityId?: string } }): Promise<React.ReactElement> {
  const type = Object.values(EntityTypes).includes(searchParams.type as EntityType) ? (searchParams.type as EntityType) : undefined
  const logs = await prisma.activityLog.findMany({
    where: { ...(type ? { entityType: type } : {}), ...(searchParams.entityId ? { entityId: searchParams.entityId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { actor: { select: { name: true, email: true } } },
  })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/audit" className={!type ? 'underline' : 'text-muted-foreground'}>
          All
        </Link>
        {Object.values(EntityTypes).map((t) => (
          <Link key={t} href={`/admin/audit?type=${t}`} className={type === t ? 'underline' : 'text-muted-foreground'}>
            {t}
          </Link>
        ))}
      </div>
      <div className="divide-y rounded-lg border font-mono text-xs">
        {logs.map((l) => (
          <div key={l.id} className="grid grid-cols-[180px_160px_1fr] gap-3 p-2">
            <span className="text-muted-foreground">{l.createdAt.toISOString()}</span>
            <span>{l.action}</span>
            <span className="truncate">
              <Link href={`/admin/audit?entityId=${l.entityId}`} className="underline">
                {l.entityType}:{l.entityId}
              </Link>{' '}
              by {l.actor?.email ?? 'system'} {l.metadata ? JSON.stringify(l.metadata) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
