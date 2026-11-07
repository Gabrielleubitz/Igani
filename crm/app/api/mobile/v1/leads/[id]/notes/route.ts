import { addNote } from '@/app/sales/actions'
import { fromAction, mobileUser } from '@/lib/mobile'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const { id } = await props.params
  const body = (await req.json().catch(() => ({}))) as { body?: string }
  return fromAction(await addNote(id, body.body ?? ''))
}
