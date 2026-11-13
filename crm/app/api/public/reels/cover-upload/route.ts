import { NextResponse } from 'next/server'
import { jobSecretOk } from '@/lib/tiktok'
import { getReel, updateReel } from '@/lib/reels'
import { uploadUrl } from '@/lib/video'

export const dynamic = 'force-dynamic'

/** The reel maker: a one-time link to replace a reel's cover (from "New cover" on the Reels page). Bearer TIKTOK_JOB_SECRET. */
export async function POST(req: Request): Promise<NextResponse> {
  if (!jobSecretOk(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = (await req.json().catch(() => ({}))) as { id?: string }
  const reel = id ? await getReel(id) : null
  if (!reel) return NextResponse.json({ error: 'Unknown reel' }, { status: 404 })
  const version = (reel.coverVersion ?? 0) + 1
  const coverKey = `reels/${reel.id}-cover-${version}.jpg`
  await updateReel(reel.id, { coverKey, coverVersion: version })
  return NextResponse.json({ uploadUrl: await uploadUrl(coverKey, 'image/jpeg') })
}
