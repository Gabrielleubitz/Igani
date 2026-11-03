import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function handler(req: Request, ctx: { params: Promise<{ nextauth: string[] }> }): Promise<Response> {
  // next-auth v4 reads params synchronously; Next 16 hands them over as a promise
  return NextAuth(authOptions())(req, { params: await ctx.params }) as Promise<Response>
}

export { handler as GET, handler as POST }
