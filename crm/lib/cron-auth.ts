import 'server-only'
import { timingSafeEqual } from 'node:crypto'

/** Vercel Cron calls carry `Authorization: Bearer $CRON_SECRET`. Without the secret every call is refused. */
export function cronAuthorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron] CRON_SECRET is not set: every call is refused, so reminders, follow-ups, meeting reminders, email sync and the weekly summary are OFF. Set it in Vercel → Settings → Environment Variables.')
    return false
  }
  const got = Buffer.from(req.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}
