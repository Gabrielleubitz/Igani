import { BrandedPage } from '@/components/brand/BrandedPage'
import { DevLogin } from '@/components/DevLogin'
import { SignInButton } from '@/components/AuthButtons'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Sign in' }

function safeCallback(value: string | string[] | undefined): string {
  const v = typeof value === 'string' ? value : '/'
  return v.startsWith('/') && !v.startsWith('//') ? v : '/'
}

export default async function LoginPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Promise<React.ReactElement> {
  const token = typeof searchParams.invite === 'string' ? searchParams.invite.slice(0, 64) : ''
  const invite = token ? await prisma.allowedUser.findUnique({ where: { inviteToken: token }, select: { role: true, active: true } }) : null
  return (
    <BrandedPage>
      <Card>
        <CardHeader className="items-center text-center">
          <CardTitle>Igani CRM</CardTitle>
          <CardDescription>
            {invite?.active ? `You have been invited as ${invite.role.toLowerCase()}. Sign in with the Google account this invite was sent to.` : 'Team access only. Sign in with your whitelisted Google account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButton callbackUrl={safeCallback(searchParams.callbackUrl)} />
          {process.env.NODE_ENV !== 'production' && process.env.DEV_LOGIN === '1' ? <DevLogin callbackUrl={safeCallback(searchParams.callbackUrl)} /> : null}
        </CardContent>
      </Card>
    </BrandedPage>
  )
}
