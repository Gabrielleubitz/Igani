import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { env } from '@/lib/env'
import { instagramConfig, token } from '@/lib/instagram'
import { listReels } from '@/lib/reels'
import { openaiFetch } from '@/lib/ai-usage'
import { after } from 'next/server'
import { pushLater } from '@/lib/push'

/**
 * Instagram DMs to Igani's account. Instagram calls /api/public/instagram/webhook for each message; the first message
 * from someone opens a conversation and a lead (tagged with the reel whose DM word they used), the admins get a push,
 * and an AI reply is drafted. Nothing is sent to the person until an admin presses Send.
 */
const GRAPH = 'https://graph.instagram.com/v21.0'

/** Meta signs webhook bodies with the app secret (X-Hub-Signature-256: sha256=<hex>). */
export function webhookSignatureOk(raw: string, header: string | null): boolean {
  const secret = instagramConfig()?.secret
  if (!secret || !header?.startsWith('sha256=')) return false
  const want = createHmac('sha256', secret).update(raw).digest('hex')
  const a = Buffer.from(header.slice(7)), b = Buffer.from(want)
  return a.length === b.length && timingSafeEqual(a, b)
}
export const verifyTokenOk = (t: string | null): boolean => Boolean(env().INSTAGRAM_WEBHOOK_VERIFY_TOKEN && t === env().INSTAGRAM_WEBHOOK_VERIFY_TOKEN)

/** The DM word each reel asks for (from its caption: DM us "WORD"). */
export function ctaWord(caption: string): string | null {
  const m = caption.match(/DM\s+(?:us\s+)?(?:the\s+word\s+)?[“"']([A-Za-z]{2,20})[”"']/i)
  return m ? m[1]!.toUpperCase() : null
}
/** Which reel a message came from: the first reel whose DM word appears in it as a word. */
export function matchReel(text: string, reels: { id: string; title: string; caption: string }[]): { reelId: string; keyword: string; title: string } | null {
  const words = new Set(text.toUpperCase().match(/[A-Z]+/g) ?? [])
  for (const r of reels) {
    const w = ctaWord(r.caption)
    if (w && words.has(w)) return { reelId: r.id, keyword: w, title: r.title }
  }
  return null
}

type Messaging = { sender?: { id?: string }; recipient?: { id?: string }; timestamp?: number; message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: unknown[] } }
type WebhookBody = { object?: string; entry?: { id?: string; messaging?: Messaging[] }[] }

/** Handle one webhook delivery. Returns how many new messages were stored. */
export async function handleWebhook(body: WebhookBody): Promise<number> {
  if (body.object !== 'instagram') return 0
  let me: string | null = null
  try { me = (await token()).userId } catch { return 0 }
  let stored = 0
  for (const e of body.entry ?? []) {
    for (const m of e.messaging ?? []) {
      const msg = m.message
      if (!msg?.mid) continue
      const text = msg.text ?? (msg.attachments?.length ? '[photo or attachment]' : '')
      if (!text) continue
      const at = new Date(m.timestamp ?? Date.now())
      // our own replies come back as echoes: record them once (sent from the Instagram app, or by us)
      if (msg.is_echo || m.sender?.id === me) {
        const other = m.recipient?.id
        if (!other) continue
        const thread = await prisma.igThread.findUnique({ where: { igsid: other } })
        if (thread && !(await prisma.igMessage.findUnique({ where: { mid: msg.mid } }))) {
          await prisma.igMessage.create({ data: { threadId: thread.id, mid: msg.mid, fromUs: true, text, at } })
          await prisma.igThread.update({ where: { id: thread.id }, data: { lastMessageAt: at } })
        }
        continue
      }
      if (await inbound(m.sender?.id, msg.mid, text, at)) stored++
    }
  }
  return stored
}

async function profile(igsid: string): Promise<{ username: string | null; name: string | null; picture: string | null }> {
  try {
    const t = await token()
    const r = await fetch(`${GRAPH}/${igsid}?fields=name,username,profile_pic&access_token=${encodeURIComponent(t.token)}`)
    const j = (await r.json()) as { name?: string; username?: string; profile_pic?: string }
    return { username: j.username ?? null, name: j.name ?? null, picture: j.profile_pic ?? null }
  } catch {
    return { username: null, name: null, picture: null }
  }
}

async function inbound(igsid: string | undefined, mid: string, text: string, at: Date): Promise<boolean> {
  if (!igsid) return false
  if (await prisma.igMessage.findUnique({ where: { mid } })) return false
  let thread = await prisma.igThread.findUnique({ where: { igsid } })
  const isNew = !thread
  if (!thread) {
    const p = await profile(igsid)
    const reels = await listReels()
    const hit = matchReel(text, reels)
    const [firstName, ...rest] = (p.name ?? '').split(' ')
    const lead = await prisma.lead.create({
      data: {
        firstName: firstName || (p.username ? `@${p.username}` : 'Instagram'),
        lastName: rest.join(' ') || null,
        source: 'instagram',
        sourceDetail: ['Instagram DM', p.username ? `@${p.username}` : null, hit ? `${hit.keyword} · reel: ${hit.title}` : null].filter(Boolean).join(' · '),
        message: text.slice(0, 2000),
        tags: ['instagram', ...(hit ? [`reel:${hit.keyword.toLowerCase()}`] : [])],
      },
    })
    thread = await prisma.igThread.create({ data: { igsid, username: p.username, name: p.name, picture: p.picture, leadId: lead.id, reelId: hit?.reelId ?? null, keyword: hit?.keyword ?? null, lastMessageAt: at, lastInboundAt: at } })
  }
  await prisma.igMessage.create({ data: { threadId: thread.id, mid, fromUs: false, text, at } })
  await prisma.igThread.update({ where: { id: thread.id }, data: { lastMessageAt: at, lastInboundAt: at, unread: { increment: 1 } } })
  const who = thread.username ? `@${thread.username}` : thread.name ?? 'Someone'
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } })
  pushLater(admins.map((a) => a.id), 'leads', { title: isNew ? `New Instagram DM lead: ${who}` : `Instagram: ${who}`, body: text.slice(0, 140), thread: `ig-${thread.id}`, category: 'LEAD', data: { url: `/admin/inbox?t=${thread.id}` } })
  // draft a reply after the webhook has answered Meta (drafting takes a few seconds)
  const id = thread.id
  const draft = (): Promise<unknown> => draftReply(id).catch(() => null)
  try { after(draft) } catch { void draft() }
  return true
}

/** Writes a short, friendly first reply (or next reply) for a person to check and send. Never sends it. */
export async function draftReply(threadId: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  const thread = await prisma.igThread.findUnique({ where: { id: threadId }, include: { messages: { orderBy: { at: 'asc' }, take: 30 } } })
  if (!thread) return null
  const reel = thread.reelId ? (await listReels()).find((r) => r.id === thread.reelId) : null
  const convo = thread.messages.map((m) => `${m.fromUs ? 'Igani' : 'Them'}: ${m.text}`).join('\n')
  const system = [
    'You write Instagram DM replies for Igani, a web agency: websites, lead capture, follow-ups and the CRM behind them. Zero upfront, live in 1–4 weeks.',
    'Write the next reply from Igani in the language they wrote in. Warm, human, short (1–3 sentences), no emojis spam, no hashtags.',
    'Goal: understand their business and book a short call. Ask one simple question. Never promise prices, results or timelines beyond what is stated. Never invent facts.',
    reel ? `They came from the reel "${reel.title}" and used the DM word "${thread.keyword}". That reel offers: ${reel.caption.slice(0, 400)}` : '',
  ].filter(Boolean).join(' ')
  const model = process.env.OPENAI_FOLLOWUP_MODEL || process.env.OPENAI_CALL_MODEL || 'gpt-5.5'
  const reasoning = /^(gpt-5|o\d)/.test(model)
  const res = await openaiFetch('ig-reply', 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, ...(reasoning ? { reasoning_effort: 'low' } : { temperature: 0.5 }), messages: [{ role: 'system', content: system }, { role: 'user', content: `Conversation so far:\n${convo}\n\nWrite only the reply text.` }] }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) return null
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const draft = j.choices?.[0]?.message?.content?.trim()
  if (!draft) return null
  await prisma.igThread.update({ where: { id: threadId }, data: { draft: draft.slice(0, 1000), draftAt: new Date() } })
  return draft
}

/** Send a reply (an admin pressed Send). Instagram allows replies within 24 h of their last message. */
export async function sendReply(threadId: string, text: string, userId: string): Promise<void> {
  const thread = await prisma.igThread.findUnique({ where: { id: threadId } })
  if (!thread) throw new Error('Conversation not found')
  if (!thread.lastInboundAt || Date.now() - thread.lastInboundAt.getTime() > 24 * 3600_000) throw new Error('Instagram only allows replies within 24 hours of their last message. Reply from the Instagram app instead.')
  const t = await token()
  const res = await fetch(`${GRAPH}/me/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${t.token}` }, body: JSON.stringify({ recipient: { id: thread.igsid }, message: { text: text.slice(0, 1000) } }) })
  const j = (await res.json().catch(() => ({}))) as { message_id?: string; error?: { message?: string } }
  if (!res.ok || !j.message_id) throw new Error(`Instagram: ${j.error?.message ?? res.status}`)
  await prisma.igMessage.create({ data: { threadId, mid: j.message_id, fromUs: true, text, sentById: userId } })
  await prisma.igThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date(), draft: null, draftAt: null, unread: 0 } })
}
