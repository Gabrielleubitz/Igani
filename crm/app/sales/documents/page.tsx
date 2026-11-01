import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatSize } from '@/lib/agreements'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Documents' }
export const dynamic = 'force-dynamic'

/** The agreements an admin uploaded for the signed-in person. Only their own, and never the file bytes in this list. */
export default async function DocumentsPage(): Promise<React.ReactElement> {
  const user = await requireUser()
  const docs = await prisma.agreement.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, fileName: true, size: true, createdAt: true } })
  return (
    <div className="space-y-5">
      <PageIntro title="Documents" hint="The agreements we have with you. Download any of them whenever you need." />
      {docs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing here yet. When an admin uploads an agreement for you, it shows up here.</p>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {docs.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {d.fileName} · {formatSize(d.size)} · added {d.createdAt.toLocaleDateString('en-GB')}
                  </div>
                </div>
                <a href={`/api/agreements/${d.id}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  Download
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
