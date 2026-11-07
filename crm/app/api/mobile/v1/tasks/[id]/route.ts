import { completeTask, reopenTask } from '@/app/sales/actions'
import { fromAction, mobileUser } from '@/lib/mobile'

export const dynamic = 'force-dynamic'

/** Tick a task off (or back on). */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const { id } = await props.params
  const b = (await req.json().catch(() => ({}))) as { leadId?: string; done?: boolean }
  return fromAction(b.done === false ? await reopenTask(b.leadId ?? '', id) : await completeTask(b.leadId ?? '', id))
}
