import 'server-only'
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(3),
  LEAD_WEBHOOK_SECRET: z.string().min(16),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  /** Optional: overrides NEXTAUTH_SECRET for signing invite links */
  INVITE_TOKEN_SECRET: z.string().min(16).optional(),
  /** Optional: comma-separated extra recipients for approval requests */
  ADMIN_NOTIFY_EMAIL: z.string().optional(),
  /** Needed in production for reminders, follow-ups and email sync: without it the hourly job refuses every call */
  CRON_SECRET: z.string().optional(),
  /** Private video storage (Cloudflare R2). Without these the Videos pages say storage is not connected. */
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  /** Listening in on live calls (lib/listen.ts): the relay's WebSocket URL (wss://listen.igani.co) and the secret it shares with the CRM. Without both, Listen is hidden. */
  LISTEN_RELAY_URL: z.string().url().optional(),
  LISTEN_RELAY_SECRET: z.string().min(16).optional(),
  /** TikTok (Login Kit + Content Posting API, lib/tiktok.ts): the app's client key/secret, and the secret the reel job uses to fetch a token. Without them the TikTok card says not configured. */
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  TIKTOK_JOB_SECRET: z.string().min(24).optional(),
})

export type Env = z.infer<typeof schema>

let cached: Env | undefined

/** Validated server env. Throws a readable error listing every missing variable. */
export function env(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid environment configuration — ${issues}`)
  }
  cached = parsed.data
  return cached
}

export function appUrl(path = ''): string {
  return new URL(path, env().NEXT_PUBLIC_APP_URL).toString()
}
