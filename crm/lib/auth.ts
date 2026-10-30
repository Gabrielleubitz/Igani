import 'server-only'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import type { Role } from '@prisma/client'
import { getServerSession, type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { redirect } from 'next/navigation'
import { logActivity } from './audit'
import { env } from './env'
import { prisma } from './prisma'

/** Google scopes: identity + create events (Meet) + read free/busy. */
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
].join(' ')

/** How often the JWT re-checks the whitelist so revoked users lose access. */
const ROLE_RECHECK_MS = 5 * 60 * 1000

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function activeRoleFor(email: string | null | undefined): Promise<Role | null> {
  if (!email) return null
  const allowed = await prisma.allowedUser.findUnique({ where: { email: normalizeEmail(email) } })
  return allowed?.active ? allowed.role : null
}

/** Dev/QA-only email login. Never enabled in production builds, and still requires an active whitelist entry. */
const devLoginEnabled = (): boolean => process.env.NODE_ENV !== 'production' && process.env.DEV_LOGIN === '1'

export function authOptions(): NextAuthOptions {
  const e = env()
  return {
    adapter: PrismaAdapter(prisma),
    secret: e.NEXTAUTH_SECRET,
    session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
    pages: { signIn: '/login', error: '/unauthorized' },
    providers: [
      GoogleProvider({
        clientId: e.GOOGLE_CLIENT_ID,
        clientSecret: e.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: { scope: GOOGLE_SCOPES, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
        },
      }),
      ...(devLoginEnabled()
        ? [
            CredentialsProvider({
              name: 'Dev login',
              credentials: { email: { label: 'Whitelisted email', type: 'email' } },
              async authorize(creds) {
                const email = creds?.email ? normalizeEmail(creds.email) : ''
                const role = await activeRoleFor(email)
                if (!role) return null
                const user = await prisma.user.upsert({ where: { email }, create: { email, name: email, role }, update: { role } })
                return { id: user.id, email: user.email, name: user.name }
              },
            }),
          ]
        : []),
    ],
    callbacks: {
      async signIn({ user, account, profile }) {
        const email = user.email ?? profile?.email
        if (!email) return '/unauthorized?reason=no-email'
        if (account?.provider === 'google' && (profile as { email_verified?: boolean } | undefined)?.email_verified === false) {
          return '/unauthorized?reason=unverified'
        }
        const role = await activeRoleFor(email)
        if (!role) return '/unauthorized?reason=not-whitelisted'

        // Returning user: sync role and refresh stored Google tokens (the adapter only writes them on first link).
        await prisma.user.updateMany({ where: { email: normalizeEmail(email) }, data: { role } })
        await prisma.allowedUser.updateMany({ where: { email: normalizeEmail(email), invitedAt: { not: null }, inviteAcceptedAt: null }, data: { inviteAcceptedAt: new Date(), inviteToken: null } })
        if (account?.provider === 'google') {
          await prisma.account.updateMany({
            where: { provider: 'google', providerAccountId: account.providerAccountId },
            data: {
              access_token: account.access_token ?? null,
              expires_at: account.expires_at ?? null,
              scope: account.scope ?? null,
              id_token: account.id_token ?? null,
              token_type: account.token_type ?? null,
              ...(account.refresh_token ? { refresh_token: account.refresh_token } : {}),
            },
          })
        }
        return true
      },
      async jwt({ token, user }) {
        if (user) {
          token.uid = user.id
          token.role = (await activeRoleFor(user.email)) ?? undefined
          token.roleCheckedAt = Date.now()
          return token
        }
        if (!token.roleCheckedAt || Date.now() - token.roleCheckedAt > ROLE_RECHECK_MS) {
          token.role = (await activeRoleFor(token.email)) ?? undefined
          token.roleCheckedAt = Date.now()
        }
        return token
      },
      async session({ session, token }) {
        if (token.uid && token.role) {
          session.user = { ...session.user, id: token.uid, role: token.role }
        }
        return session
      },
    },
    events: {
      async createUser({ user }) {
        const role = await activeRoleFor(user.email)
        if (user.email) {
          await prisma.user.update({ where: { id: user.id }, data: { role, email: normalizeEmail(user.email) } })
        }
        await logActivity({ entityType: 'USER', entityId: user.id, action: 'user.created', actorId: user.id, metadata: { role } })
      },
      async signIn({ user, isNewUser }) {
        await logActivity({ entityType: 'USER', entityId: user.id, action: 'user.signed_in', actorId: isNewUser ? null : user.id })
      },
    },
  }
}

export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: Role
}

/**
 * Server-side guard for pages and server actions. Re-reads the whitelist from the
 * database (the JWT may be up to ROLE_RECHECK_MS stale) and enforces roles.
 */
export async function requireUser(roles?: readonly Role[]): Promise<SessionUser> {
  const session = await getServerSession(authOptions())
  if (!session?.user?.id) redirect('/login')
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } })
  const role = await activeRoleFor(dbUser?.email)
  if (!dbUser?.email || !role) redirect('/unauthorized?reason=not-whitelisted')
  if (roles && !roles.includes(role)) redirect('/unauthorized?reason=forbidden')
  return { id: dbUser.id, email: dbUser.email, name: dbUser.name, role }
}

export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions())
  if (!session?.user?.id || !session.user.email) return null
  return { id: session.user.id, email: session.user.email, name: session.user.name ?? null, role: session.user.role }
}
