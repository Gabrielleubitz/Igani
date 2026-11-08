import { z } from 'zod'
import { fail, json, mobileUser } from '@/lib/mobile'
import { prisma } from '@/lib/prisma'
import { PUSH_KINDS, pushConfigured } from '@/lib/push'

export const dynamic = 'force-dynamic'

const Token = z.string().regex(/^[0-9a-f]{32,200}$/i)
const Prefs = z.object({ chat: z.boolean(), texts: z.boolean(), calls: z.boolean(), leads: z.boolean() }).partial()

/** This phone's notification settings (and whether the server can send at all). */
export async function GET(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const d = Token.safeParse(token).success ? await prisma.pushDevice.findUnique({ where: { token } }) : null
  const prefs = (d?.userId === user.id ? (d.prefs as Record<string, boolean> | null) : null) ?? {}
  return json({ ready: pushConfigured(), kinds: PUSH_KINDS.filter((k) => k.key !== 'texts' && k.key !== 'calls' ? true : user.role !== 'MARKETING').map((k) => ({ ...k, on: prefs[k.key] !== false })) })
}

/** The app registers (or refreshes) its APNs token after sign-in, and saves its notification choices. */
export async function POST(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const parsed = z.object({ token: Token, env: z.enum(['sandbox', 'production']), prefs: Prefs.optional() }).safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('Invalid device token.')
  const { token, env, prefs } = parsed.data
  const existing = await prisma.pushDevice.findUnique({ where: { token } })
  const merged = { ...((existing?.userId === user.id ? (existing.prefs as Record<string, boolean> | null) : null) ?? {}), ...(prefs ?? {}) }
  await prisma.pushDevice.upsert({
    where: { token },
    create: { token, env, userId: user.id, prefs: merged },
    // a phone that changed hands (another sign-in) belongs to the new person, with fresh choices
    update: { env, userId: user.id, lastSeenAt: new Date(), prefs: existing?.userId === user.id ? merged : (prefs ?? {}) },
  })
  return json({ ok: true })
}

/** Signed out: this phone stops getting this person's notifications. */
export async function DELETE(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const token = new URL(req.url).searchParams.get('token') ?? ''
  await prisma.pushDevice.deleteMany({ where: { token, userId: user.id } })
  return json({ ok: true })
}
