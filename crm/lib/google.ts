import 'server-only'
import { auth, calendar, type calendar_v3 } from '@googleapis/calendar'
import { env } from './env'
import { prisma } from './prisma'

export class GoogleNotConnectedError extends Error {
  constructor(hostId: string) {
    super(`Host ${hostId} has no Google account with a refresh token — they must sign in again to grant calendar access.`)
    this.name = 'GoogleNotConnectedError'
  }
}

/** Calendar client authenticated as the host. Refreshed tokens are written back to the Account row. */
export async function calendarForHost(hostId: string): Promise<calendar_v3.Calendar> {
  const account = await prisma.account.findFirst({
    where: { userId: hostId, provider: 'google' },
    orderBy: { expires_at: 'desc' },
  })
  if (!account?.refresh_token) throw new GoogleNotConnectedError(hostId)

  const e = env()
  const client = new auth.OAuth2(e.GOOGLE_CLIENT_ID, e.GOOGLE_CLIENT_SECRET)
  client.setCredentials({
    access_token: account.access_token ?? undefined,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
    scope: account.scope ?? undefined,
    token_type: account.token_type ?? undefined,
  })
  client.on('tokens', (tokens) => {
    void prisma.account
      .update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token ?? undefined,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
          ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        },
      })
      .catch((err: unknown) => console.error('[google] failed to persist refreshed tokens', err))
  })
  return calendar({ version: 'v3', auth: client })
}
