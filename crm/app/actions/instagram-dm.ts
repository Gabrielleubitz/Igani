'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { draftReply, sendReply } from '@/lib/instagram-dm'

export type DmAction = { ok: true; draft?: string | null } | { ok: false; error: string }

/** An admin pressed Send: the reply goes to the person on Instagram. */
export async function sendIgReply(threadId: string, text: string): Promise<DmAction> {
  const user = await requireUser(['ADMIN'])
  const t = text.trim()
  if (!t) return { ok: false, error: 'Write a reply first.' }
  try {
    await sendReply(threadId, t, user.id)
    revalidatePath('/admin/inbox')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Instagram refused the message' }
  }
}

/** A fresh AI draft for this conversation (never sent automatically). */
export async function redraftIgReply(threadId: string): Promise<DmAction> {
  await requireUser(['ADMIN'])
  const d = await draftReply(threadId).catch(() => null)
  return d ? { ok: true, draft: d } : { ok: false, error: 'Could not write a draft right now.' }
}

export async function markIgRead(threadId: string): Promise<void> {
  await requireUser(['ADMIN'])
  await prisma.igThread.update({ where: { id: threadId }, data: { unread: 0 } }).catch(() => null)
}
