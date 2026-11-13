import { getReel, reelFileSigOk } from '@/lib/reels'
import { playUrl } from '@/lib/video'

export const dynamic = 'force-dynamic'

/** The reel's video for TikTok to pull, from our verified domain. Needs a signed link (1 hour); streams from the private bucket. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params
  const url = new URL(req.url)
  if (!reelFileSigOk(id, url.searchParams.get('exp'), url.searchParams.get('sig'))) return new Response('Not found', { status: 404 })
  const reel = await getReel(id)
  if (!reel) return new Response('Not found', { status: 404 })
  const range = req.headers.get('range')
  const upstream = await fetch(await playUrl(reel.key, 'video/mp4', 600), { headers: range ? { range } : {} })
  const headers = new Headers({ 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'cache-control': 'private, no-store' })
  for (const h of ['content-length', 'content-range']) { const v = upstream.headers.get(h); if (v) headers.set(h, v) }
  return new Response(upstream.body, { status: upstream.status, headers })
}
