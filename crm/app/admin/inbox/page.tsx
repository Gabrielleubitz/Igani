import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { instagramStatus } from '@/lib/instagram'
import { listReels } from '@/lib/reels'
import { DmInbox, type DmThread } from '@/components/admin/DmInbox'

export const metadata = { title: 'Instagram DMs' }
export const dynamic = 'force-dynamic'

const fmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem' })

/** Instagram DMs to Igani: every conversation is a lead; replies are drafted by AI and sent only when an admin presses Send. */
export default async function InboxPage({ searchParams }: { searchParams: Promise<{ t?: string }> }): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const [threads, ig, reels, sp] = await Promise.all([
    prisma.igThread.findMany({ orderBy: { lastMessageAt: 'desc' }, take: 100, include: { messages: { orderBy: { at: 'asc' }, take: 200 }, lead: { select: { id: true, status: true, bookings: { select: { id: true }, take: 1 } } } } }),
    instagramStatus(),
    listReels(),
    searchParams,
  ])
  const title = new Map(reels.map((r) => [r.id, r.title]))
  const now = Date.now()
  const rows: DmThread[] = threads.map((t) => ({
    id: t.id,
    who: t.username ? `@${t.username}` : t.name ?? 'Instagram contact',
    name: t.name,
    picture: t.picture,
    unread: t.unread,
    last: t.messages.at(-1)?.text ?? '',
    lastAt: fmt.format(t.lastMessageAt),
    keyword: t.keyword,
    reel: t.reelId ? (title.get(t.reelId) ?? null) : null,
    leadId: t.lead?.id ?? null,
    leadStatus: t.lead?.status ?? null,
    booked: Boolean(t.lead?.bookings.length),
    draft: t.draft,
    canReply: Boolean(t.lastInboundAt && now - t.lastInboundAt.getTime() < 24 * 3600_000),
    messages: t.messages.map((m) => ({ id: m.id, fromUs: m.fromUs, text: m.text, at: fmt.format(m.at) })),
  }))
  return <DmInbox threads={rows} initial={sp.t ?? rows[0]?.id ?? null} connected={ig.connected} canMessage={ig.connected && ig.canMessage} />
}
