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
