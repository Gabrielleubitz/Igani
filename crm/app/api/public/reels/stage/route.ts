import { NextResponse } from 'next/server'
import { jobSecretOk } from '@/lib/tiktok'
import { addReel } from '@/lib/reels'
import { storageConfigured, uploadUrl } from '@/lib/video'

export const dynamic = 'force-dynamic'

/** The reel job: register a finished reel and get a one-time link to upload it to the private bucket. Bearer TIKTOK_JOB_SECRET. */
export async function POST(req: Request): Promise<NextResponse> {
  if (!jobSecretOk(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!storageConfigured()) return NextResponse.json({ error: 'Video storage (R2) is not configured' }, { status: 503 })
  const body = (await req.json().catch(() => ({}))) as { title?: string; caption?: string; coverMs?: number }
  if (!body.title || !body.caption) return NextResponse.json({ error: 'title and caption are required' }, { status: 400 })
  const reel = await addReel(body.title, body.caption, body.coverMs)
  return NextResponse.json({ id: reel.id, uploadUrl: await uploadUrl(reel.key, 'video/mp4'), coverUploadUrl: await uploadUrl(reel.coverKey!, 'image/jpeg') })
}
