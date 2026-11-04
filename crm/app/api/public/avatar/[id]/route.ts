import { googlePhotoAtSize, isGooglePhoto } from '@/lib/avatar'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * A teammate's photo, 256 px square, cached a day at the edge (and a week stale-while-revalidate): the URL carries a
 * version, so a new photo is a new URL. Only teammates (users with a role) have one; anything else is a 404.
 */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await props.params
  if (!/^c[a-z0-9]{20,30}$/.test(id)) return new Response(null, { status: 404 })
  const user = await prisma.user.findUnique({ where: { id }, select: { image: true, role: true } })
  if (!user?.role || !isGooglePhoto(user.image)) return new Response(null, { status: 404, headers: { 'cache-control': 'public, max-age=300' } })
  const res = await fetch(googlePhotoAtSize(user.image), { signal: AbortSignal.timeout(8000), cache: 'no-store' }).catch(() => null)
  const type = res?.headers.get('content-type') ?? ''
  if (!res?.ok || !/^image\/(jpeg|png|webp|gif)$/.test(type.split(';')[0]!.trim())) return new Response(null, { status: 404, headers: { 'cache-control': 'public, max-age=300' } })
  const body = await res.arrayBuffer()
  if (body.byteLength > 2_000_000) return new Response(null, { status: 404 })
  return new Response(body, {
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      'x-content-type-options': 'nosniff',
    },
  })
}
