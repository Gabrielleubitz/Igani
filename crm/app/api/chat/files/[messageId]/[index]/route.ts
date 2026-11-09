import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { canSeeChannel, readFiles } from '@/lib/chat'
import { chatFileLink, cloudinaryConfigured } from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** A file shared in team chat: only for people who can see that conversation, through a short-lived private link. */
export async function GET(req: Request, props: { params: Promise<{ messageId: string; index: string }> }): Promise<Response> {
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const { messageId, index } = await props.params
  if (!/^[a-z0-9]{20,40}$/i.test(messageId) || !/^\d{1,2}$/.test(index) || !cloudinaryConfigured()) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const msg = await prisma.chatMessage.findUnique({ where: { id: messageId }, include: { channel: true } })
  if (!msg || msg.deletedAt || msg.channel.archivedAt || !(await canSeeChannel(msg.channel, user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const file = readFiles(msg.attachments)[Number(index)] as (ReturnType<typeof readFiles>[number] & { rt?: string; format?: string | null }) | undefined
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const q = new URL(req.url).searchParams
  // ?size=thumb a preview, ?view=1 shown in the viewer (PDFs and videos inline), ?download=1 saved under its name
  const mode = q.get('size') === 'thumb' ? 'thumb' : q.get('download') ? 'download' : q.get('view') ? 'view' : undefined
  return NextResponse.redirect(chatFileLink(file, { mode }), { status: 302, headers: { 'cache-control': 'private, max-age=300' } })
}
