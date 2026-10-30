import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function handler(req: Request, ctx: { params: { nextauth: string[] } }): Promise<Response> {
  return NextAuth(authOptions())(req, ctx) as Promise<Response>
}

export { handler as GET, handler as POST }
