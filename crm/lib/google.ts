import 'server-only'
import { auth, calendar, type calendar_v3 } from '@googleapis/calendar'
import { gmail, type gmail_v1 } from '@googleapis/gmail'
import { env } from './env'
import { GMAIL_READ_SCOPE } from './google-scopes'
import { prisma } from './prisma'

export { GMAIL_READ_SCOPE }

export class GoogleNotConnectedError extends Error {
  constructor(hostId: string) {
    super(`Host ${hostId} has no Google account with a refresh token — they must connect Google (Send meeting invite → Connect Google).`)
    this.name = 'GoogleNotConnectedError'
  }
}

export class GmailNotConnectedError extends Error {
  constructor(userId: string) {
    super(`User ${userId} has not granted Gmail read access — they must reconnect Google from the CRM.`)
    this.name = 'GmailNotConnectedError'
  }
}

async function googleAccount(userId: string) {
  return prisma.account.findFirst({ where: { userId, provider: 'google' }, orderBy: { expires_at: 'desc' } })
}

/** True when the user's stored Google grant includes Gmail read access. */
export async function hasGmailAccess(userId: string): Promise<boolean> {
  const a = await googleAccount(userId)
  return Boolean(a?.refresh_token && a.scope?.split(/\s+/).includes(GMAIL_READ_SCOPE))
}

/** OAuth client authenticated as the user. Refreshed tokens are written back to the Account row. */
async function oauthFor(userId: string, needGmail: boolean): Promise<InstanceType<typeof auth.OAuth2>> {
  const account = await googleAccount(userId)
  if (!account?.refresh_token) throw needGmail ? new GmailNotConnectedError(userId) : new GoogleNotConnectedError(userId)
  if (needGmail && !account.scope?.split(/\s+/).includes(GMAIL_READ_SCOPE)) throw new GmailNotConnectedError(userId)
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
  return client
}

/** Calendar client authenticated as the host. */
export async function calendarForHost(hostId: string): Promise<calendar_v3.Calendar> {
  return calendar({ version: 'v3', auth: await oauthFor(hostId, false) })
}

/** Read-only Gmail client for the user (throws GmailNotConnectedError if they haven't granted it). */
export async function gmailForUser(userId: string): Promise<gmail_v1.Gmail> {
  return gmail({ version: 'v1', auth: await oauthFor(userId, true) })
}
