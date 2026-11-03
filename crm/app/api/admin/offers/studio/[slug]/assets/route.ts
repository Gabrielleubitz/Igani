import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { slugProblem } from '@/lib/offer-modules'
import { isLocalDev } from '@/lib/offers'
import { ASSET_TYPES as TYPES, listAssets, writeOfferData } from '@/lib/offer-studio'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Studio only (localhost): the client's logo and images for an offer, saved into public/offers/<slug>/ so they
 * ship with "push" and Claude can use them in the mockups. Never available on the deployed site.
 */
const MAX = 8 * 1024 * 1024

const dirFor = (slug: string): string => join(process.cwd(), 'public', 'offers', slug)

async function guard(slug: string): Promise<NextResponse | null> {
  if (!isLocalDev() || slugProblem(slug)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function GET(_req: Request, { params }: { params: { slug: string } }): Promise<NextResponse> {
  return (await guard(params.slug)) ?? NextResponse.json({ assets: listAssets(params.slug) })
}

export async function POST(req: Request, { params }: { params: { slug: string } }): Promise<NextResponse> {
  const denied = await guard(params.slug)
  if (denied) return denied
  const form = await req.formData()
  const kind = form.get('kind') === 'logo' ? 'logo' : 'image'
  const files = form.getAll('file').filter((f): f is File => f instanceof File)
  if (!files.length) return NextResponse.json({ error: 'Choose a file.' }, { status: 400 })
  const dir = dirFor(params.slug)
  mkdirSync(dir, { recursive: true })
  for (const file of kind === 'logo' ? files.slice(0, 1) : files) {
    const ext = TYPES[file.type]
    if (!ext) return NextResponse.json({ error: `${file.name}: use PNG, JPG, WebP, SVG or GIF.` }, { status: 400 })
    if (file.size > MAX) return NextResponse.json({ error: `${file.name} is over 8 MB.` }, { status: 400 })
    let name: string
    if (kind === 'logo') {
      // One logo per offer: replace any previous one, whatever its format
      for (const old of readdirSync(dir).filter((n) => /^logo\./i.test(n))) rmSync(join(dir, old))
      name = `logo${ext}`
    } else {
      const base = file.name.replace(/\.[^.]+$/, '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image'
      name = `${base}${ext}`
      for (let n = 2; readdirSync(dir).includes(name); n++) name = `${base}-${n}${ext}`
    }
    writeFileSync(join(dir, name), Buffer.from(await file.arrayBuffer()))
  }
  await writeOfferData(params.slug) // Claude reads the new logo/images from offer-data.json
  return NextResponse.json({ assets: listAssets(params.slug) })
}

export async function DELETE(req: Request, { params }: { params: { slug: string } }): Promise<NextResponse> {
  const denied = await guard(params.slug)
  if (denied) return denied
  const name = new URL(req.url).searchParams.get('name') ?? ''
  if (!/^[a-z0-9-]+\.(png|jpg|webp|svg|gif)$/i.test(name)) return NextResponse.json({ error: 'Bad file name' }, { status: 400 })
  rmSync(join(dirFor(params.slug), name), { force: true })
  await writeOfferData(params.slug)
  return NextResponse.json({ assets: listAssets(params.slug) })
}
