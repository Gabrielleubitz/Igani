import { CHAT_SOUND } from '@/lib/chat-notify'
import { fail, json, mobileUser } from '@/lib/mobile'
import { pushConfigured, pushTo } from '@/lib/push'

export const dynamic = 'force-dynamic'

/** Profile → Notifications → Send a test: a sample notification to your own phones. */
export async function POST(): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  if (!pushConfigured()) return fail('Igani’s server can’t send notifications yet: an admin needs to add the Apple push key in Vercel.', 503)
  const sent = await pushTo([user.id], 'chat', { title: 'Igani', body: 'Notifications are working. You’ll hear about messages, texts, missed calls and new leads here. 🎉', sound: CHAT_SOUND, thread: 'test', category: 'CHAT', data: { type: 'test' } }, { everyKind: true })
  return sent ? json({ sent }) : fail('Apple didn’t accept the notification. Check that notifications are on for Igani CRM, then try again.', 502)
}
