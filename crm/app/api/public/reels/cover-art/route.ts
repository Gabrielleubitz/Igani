import { NextResponse } from 'next/server'
import { jobSecretOk } from '@/lib/tiktok'
import { generateCoverArt } from '@/lib/social-cover'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** The reel job: on-brand cover art for a post (OpenAI image). Bearer TIKTOK_JOB_SECRET. Returns base64 PNG. */
export async function POST(req: Request): Promise<NextResponse> {
  if (!jobSecretOk(req.headers.get('authorization'))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { title?: string; story?: string }
  if (!body.title || !body.story) return NextResponse.json({ error: 'title and story are required' }, { status: 400 })
  try {
    return NextResponse.json({ png: await generateCoverArt(body.title, body.story) })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Image generation failed' }, { status: 502 })
  }
}
