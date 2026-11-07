import 'server-only'
import { z } from 'zod'
import { cloudinaryConfigured, copyMeetRecording } from './cloudinary'
import { roomCodeFromFqn } from './meet'
import { prisma } from './prisma'

/** 8x8 keeps a recording for 24 hours after it tells us about it. */
const SOURCE_HOURS = 24

const Uploaded = z.object({
  eventType: z.literal('RECORDING_UPLOADED'),
  fqn: z.string(),
  idempotencyKey: z.string().optional(),
  sessionId: z.string().optional(),
  data: z.object({
    preAuthenticatedLink: z.string().url(),
    recordingSessionId: z.string().optional(),
    durationSec: z.number().optional(),
    startTimestamp: z.number().optional(),
    participants: z.array(z.object({ name: z.string().optional(), id: z.string().optional() }).passthrough()).optional(),
  }),
})

/**
 * Handles one 8x8 webhook event (already signature-checked). Returns the recording to copy into our storage, or null
 * when there's nothing to do (other events, rooms that aren't ours, repeats).
 */
export async function recordJaasEvent(body: unknown, now = new Date()): Promise<string | null> {
  const parsed = Uploaded.safeParse(body)
  if (!parsed.success) return null
  const e = parsed.data
  const link = new URL(e.data.preAuthenticatedLink)
  if (link.protocol !== 'https:') return null
  const code = roomCodeFromFqn(e.fqn)
  if (!code) return null
  const room = await prisma.meetRoom.findUnique({ where: { code }, select: { id: true } })
  if (!room) return null
  const sessionId = (e.data.recordingSessionId ?? e.idempotencyKey ?? e.sessionId ?? '').slice(0, 200)
  if (!sessionId) return null
  const seen = await prisma.meetRecording.findUnique({ where: { sessionId }, select: { id: true, publicId: true } })
  if (seen?.publicId) return null
  const data = {
    sourceUrl: link.toString(),
    sourceUntil: new Date(now.getTime() + SOURCE_HOURS * 3600_000),
    durationSec: e.data.durationSec != null ? Math.max(0, Math.round(e.data.durationSec)) : null,
    startedAt: e.data.startTimestamp ? new Date(e.data.startTimestamp) : null,
    participants: (e.data.participants ?? []).slice(0, 50).map((p) => ({ name: p.name?.slice(0, 80) ?? null, id: p.id?.slice(0, 80) ?? null })),
  }
  const rec = await prisma.meetRecording.upsert({ where: { sessionId }, create: { roomId: room.id, sessionId, status: 'processing', ...data }, update: data, select: { id: true } })
  return rec.id
}

/** Copies a recording from 8x8 into Cloudinary. On failure it stays playable from 8x8's link until that expires. */
export async function saveMeetRecording(id: string): Promise<void> {
  const rec = await prisma.meetRecording.findUnique({ where: { id }, select: { id: true, sourceUrl: true, sourceUntil: true, publicId: true, room: { select: { code: true } } } })
  if (!rec || rec.publicId || !rec.sourceUrl) return
  if (!cloudinaryConfigured()) {
    await prisma.meetRecording.update({ where: { id }, data: { status: 'temporary', error: 'Storage (Cloudinary) isn’t set up, so this recording is only kept by 8x8 for 24 hours. Download it to keep it.' } })
    return
  }
  try {
    const { publicId, bytes } = await copyMeetRecording(rec.sourceUrl, `${rec.room.code}-${rec.id}`)
    await prisma.meetRecording.update({ where: { id }, data: { status: 'saved', publicId, bytes, error: null } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[meet-recording] copy failed', id, msg)
    await prisma.meetRecording.update({
      where: { id },
      data: { status: 'temporary', error: /too large|file size/i.test(msg) ? 'Too large for the storage plan. Download it within 24 hours to keep it.' : 'Couldn’t save a copy yet. Try “Save copy” again, or download it within 24 hours.' },
    })
  }
}

export type RecordingState = 'processing' | 'saved' | 'temporary' | 'expired'

/** What an admin can do with a recording right now. */
export function recordingState(r: { status: string; publicId: string | null; sourceUrl: string | null; sourceUntil: Date | null }, now = new Date()): RecordingState {
  if (r.publicId) return 'saved'
  const live = Boolean(r.sourceUrl && r.sourceUntil && r.sourceUntil > now)
  if (r.status === 'processing' && live) return 'processing'
  return live ? 'temporary' : 'expired'
}
