import { fail, json, mobileUser } from '@/lib/mobile'
import { prisma } from '@/lib/prisma'
import { formatPhone } from '@/lib/phone-numbers'
import { dialerDemo, identityFor, iosPushCredential, twilioConfig, voiceToken } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/**
 * The iPhone app's Twilio Voice token: outgoing calls through our TwiML app and incoming calls to this user's identity
 * (the same one the website's dialer registers, so a call rings the browser and the phone together). `push` says whether
 * the phone can be woken for incoming calls (a VoIP push credential is set up for this build).
 */
export async function GET(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  if (user.role !== 'ADMIN' && user.role !== 'SALES') return fail('Calling is for the sales team.', 403)
  if (dialerDemo()) return json({ demo: true, line: null, push: false })
  const c = twilioConfig()
  if (!c) return fail('Calling is not set up yet.', 503)
  const line = await prisma.phoneLine.findUnique({ where: { userId: user.id } })
  if (!line?.active) return fail('You don’t have a phone line yet. Ask an admin.', 403)
  const credential = iosPushCredential(new URL(req.url).searchParams.get('sandbox') === '1')
  return json({ demo: false, token: voiceToken(c, user.id, 3600, credential ?? undefined), identity: identityFor(user.id), ttlSec: 3600, line: formatPhone(line.number), push: Boolean(credential) })
}
