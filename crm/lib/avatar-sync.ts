/**
 * Make sure a teammate's photo is known without them having to sign in again. The photo is part of the basic Google
 * profile they already allowed (no new permission): first from the sign-in token we stored, then by asking Google
 * (only when they've connected Google), at most every 6 hours per person.
 */
import 'server-only'
import { isGooglePhoto } from './avatar'
import { googleGetter } from './google'
import { prisma } from './prisma'

const RETRY_MS = 6 * 3600_000

/** The `picture` claim of a stored Google ID token (we stored it ourselves at sign-in; only read, never trusted for auth). */
export function pictureFromIdToken(idToken: string | null | undefined): string | null {
  const part = idToken?.split('.')[1]
  if (!part) return null
  try {
    const claims = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as { picture?: unknown }
    return typeof claims.picture === 'string' && isGooglePhoto(claims.picture) ? claims.picture : null
  } catch {
    return null
  }
}

/** Returns the photo URL now stored (or null if none could be found). Cheap when the photo is already known. */
export async function ensureAvatar(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { image: true } })
  if (!user) return null
  if (isGooglePhoto(user.image)) return user.image

  // a link Google stopped serving is never used again
  const dead = (await prisma.siteSetting.findUnique({ where: { key: `avatar.dead:${userId}` } }))?.value
  const accounts = await prisma.account.findMany({ where: { userId, provider: 'google' }, select: { id_token: true } })
  let picture = accounts.map((a) => pictureFromIdToken(a.id_token)).find((p) => p && p !== dead) ?? null

  if (!picture) {
    const key = `avatar.checked:${userId}`
    const last = await prisma.siteSetting.findUnique({ where: { key } })
    if (last && Date.now() - Number(last.value) < RETRY_MS) return null
    await prisma.siteSetting.upsert({ where: { key }, create: { key, value: Date.now() }, update: { value: Date.now() } })
    try {
      const get = await googleGetter(userId)
      const info = await get<{ picture?: string }>('https://www.googleapis.com/oauth2/v3/userinfo')
      picture = isGooglePhoto(info.picture) && info.picture !== dead ? info.picture! : null
    } catch {
      return null // not connected to Google, or Google said no: initials until next sign-in
    }
  }
  if (!picture) return null
  await prisma.user.update({ where: { id: userId }, data: { image: picture } })
  return picture
}

/** Google no longer serves this photo link: forget it, so the next page view finds the current one. */
export async function forgetDeadAvatar(userId: string, url: string): Promise<void> {
  await prisma.siteSetting.upsert({ where: { key: `avatar.dead:${userId}` }, create: { key: `avatar.dead:${userId}`, value: url }, update: { value: url } })
  await prisma.siteSetting.deleteMany({ where: { key: `avatar.checked:${userId}` } })
  await prisma.user.updateMany({ where: { id: userId, image: url }, data: { image: null } })
}
