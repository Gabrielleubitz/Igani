import { formatSize } from '@/lib/agreements'
import { appUrl } from '@/lib/env'
import { json, mobileUser } from '@/lib/mobile'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** My documents: the ones an admin uploaded for me (only my own). */
export async function GET(): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  // Signed commission agreements are emailed to both parties and not stored, so only the files an admin uploaded are listed
  const docs = await prisma.agreement.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, fileName: true, size: true, createdAt: true } })
  return json({
    documents: [
      ...docs.map((d) => ({ id: d.id, title: d.title, sub: `${d.fileName} · ${formatSize(d.size)}`, at: d.createdAt, url: appUrl(`/api/agreements/${d.id}`), signed: false })),
    ],
  })
}
