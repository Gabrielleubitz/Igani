import { BrandedPage } from '@/components/brand/BrandedPage'
import { DevLogin } from '@/components/DevLogin'
import { SignInButton } from '@/components/AuthButtons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Sign in' }

function safeCallback(value: string | string[] | undefined): string {
  const v = typeof value === 'string' ? value : '/'
  return v.startsWith('/') && !v.startsWith('//') ? v : '/'
}

export default function LoginPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): React.ReactElement {
  return (
    <BrandedPage>
      <Card>
        <CardHeader className="items-center text-center">
          <CardTitle>Igani CRM</CardTitle>
          <CardDescription>Team access only. Sign in with your whitelisted Google account.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButton callbackUrl={safeCallback(searchParams.callbackUrl)} />
          {process.env.NODE_ENV !== 'production' && process.env.DEV_LOGIN === '1' ? <DevLogin callbackUrl={safeCallback(searchParams.callbackUrl)} /> : null}
        </CardContent>
      </Card>
    </BrandedPage>
  )
}
