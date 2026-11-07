import { formatSize } from '@/lib/agreements'
import { appUrl } from '@/lib/env'
import { json, mobileUser } from '@/lib/mobile'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** My documents: the agreements I signed and the ones an admin uploaded for me (only my own). */
export async function GET(): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const [docs, signed] = await Promise.all([
    prisma.agreement.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, fileName: true, size: true, createdAt: true } }),
    user.email ? prisma.agreementAcceptance.findMany({ where: { email: user.email.toLowerCase() }, orderBy: { signedAt: 'desc' }, select: { id: true, version: true, signedAt: true } }) : Promise.resolve([]),
  ])
  return json({
    documents: [
      ...signed.map((a) => ({ id: `s-${a.id}`, title: 'Signed agreement', sub: `Version ${a.version}`, at: a.signedAt, url: appUrl(`/api/agreements/signed/${a.id}`), signed: true })),
      ...docs.map((d) => ({ id: d.id, title: d.title, sub: `${d.fileName} · ${formatSize(d.size)}`, at: d.createdAt, url: appUrl(`/api/agreements/${d.id}`), signed: false })),
    ],
  })
}
