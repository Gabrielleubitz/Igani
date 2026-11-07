import { avatarPath } from '@/lib/avatar'
import { appUrl } from '@/lib/env'
import { LEAD_STATUSES, STATUS_LABEL } from '@/lib/format'
import { meetUrl } from '@/lib/meet-links'
import { json, mobileUser } from '@/lib/mobile'
import { navPagesFor } from '@/lib/nav'
import { prisma } from '@/lib/prisma'
import { stagesFor } from '@/lib/stage-rules'

export const dynamic = 'force-dynamic'

/** Who's signed in, which CRM pages they may open (the More tab), and the pipeline stages they may set. */
export async function GET(): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, name: true, email: true, image: true, timeZone: true } })
  const photo = avatarPath(me)
  const settable = new Set<string>(stagesFor(user.role, LEAD_STATUSES))
  return json({
    id: me.id,
    name: me.name ?? me.email ?? 'You',
    email: me.email ?? '',
    role: user.role,
    avatar: photo ? appUrl(photo) : null,
    timeZone: me.timeZone,
    appUrl: appUrl('/'),
    meetUrl: meetUrl('/'),
    pages: navPagesFor(user.role),
    stages: LEAD_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], settable: settable.has(s) })),
  })
}
