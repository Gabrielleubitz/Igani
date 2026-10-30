import Image from 'next/image'
import { SignInButton } from '@/components/AuthButtons'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Sign in' }

function safeCallback(value: string | string[] | undefined): string {
  const v = typeof value === 'string' ? value : '/'
  return v.startsWith('/') && !v.startsWith('//') ? v : '/'
}

export default function LoginPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image src="/igani-logo.png" alt="Igani" width={110} height={32} priority className="mb-4 h-8 w-auto" />
          <CardTitle>Igani CRM</CardTitle>
          <CardDescription>Team access only. Sign in with your whitelisted Google account.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignInButton callbackUrl={safeCallback(searchParams.callbackUrl)} />
        </CardContent>
      </Card>
    </main>
  )
}
