import { BrandedPage } from '@/components/brand/BrandedPage'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Access denied' }

const MESSAGES: Record<string, string> = {
  'not-whitelisted': 'This Google account is not on the Igani team list. Ask an admin to add your email.',
  forbidden: 'Your role does not have access to that area.',
  unverified: 'Your Google email address is not verified.',
  'no-email': 'Google did not share an email address for this account.',
  AccessDenied: 'This Google account is not on the Igani team list.',
}

export default function UnauthorizedPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): React.ReactElement {
  const reason = typeof searchParams.reason === 'string' ? searchParams.reason : typeof searchParams.error === 'string' ? searchParams.error : ''
  return (
    <BrandedPage wide>
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>{MESSAGES[reason] ?? 'You are not allowed to use Igani CRM with this account.'}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          {reason === 'forbidden' ? (
            <Link href="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              ← Back to the CRM
            </Link>
          ) : null}
          <Link href="/login" className="text-sm underline underline-offset-4">
            Try a different account
          </Link>
        </CardContent>
      </Card>
    </BrandedPage>
  )
}
