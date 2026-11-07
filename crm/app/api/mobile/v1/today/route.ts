import { json, mobileUser } from '@/lib/mobile'
import { loadToday } from '@/lib/today'

export const dynamic = 'force-dynamic'

/** The same Today the website shows: agenda, actions, KPIs, deals to move, calls and recent activity. */
export async function GET(): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  return json(await loadToday(user))
}
