import type { LeadStatus } from '@prisma/client'
import { updateLeadStatus } from '@/app/actions/leads'
import { fromAction, mobileUser } from '@/lib/mobile'

export const dynamic = 'force-dynamic'

/** Move a lead to another stage, with the website's own rules (who may set what, lost reason). */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const { id } = await props.params
  const body = (await req.json().catch(() => ({}))) as { status?: string; lostReason?: string }
  return fromAction(await updateLeadStatus(id, body.status as LeadStatus, body.lostReason ? { lostReason: body.lostReason } : {}))
}
