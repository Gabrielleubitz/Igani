import Image from 'next/image'
import { ConfirmInviteButton } from '@/components/ConfirmInviteButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { verifyInviteToken } from '@/lib/tokens'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Meeting invitation', referrer: 'no-referrer' }

function Shell({ title, description, children }: { title: string; description: string; children?: React.ReactNode }): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Image src="/igani-logo.png" alt="Igani" width={90} height={26} className="mb-4 h-6 w-auto self-start" />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children ? <CardContent>{children}</CardContent> : null}
      </Card>
    </main>
  )
}

export default async function InvitePage({ params }: { params: { token: string } }): Promise<React.ReactElement> {
  const token = decodeURIComponent(params.token)
  const verified = verifyInviteToken(token)
  const booking = verified.ok
    ? await prisma.booking.findUnique({ where: { inviteToken: token }, include: { host: { select: { name: true, timeZone: true } } } })
    : null
  if (!booking || !verified.ok || booking.id !== verified.bookingId) {
    if (!verified.ok && verified.reason === 'expired') {
      return <Shell title="Invitation expired" description="Ask your Igani contact to send a new time." />
    }
    return <Shell title="Invitation not found" description="This link is invalid. Check the email you received." />
  }

  const when = formatDateTime(booking.startTime, booking.host.timeZone)
  if (booking.status === 'CANCELLED') return <Shell title="Invitation withdrawn" description={`The ${when} meeting was cancelled.`} />
  if (booking.status === 'CONFIRMED') {
    return (
      <Shell title={booking.title} description={`Confirmed for ${when} with ${booking.host.name ?? 'Igani'}.`}>
        {booking.meetUrl ? (
          <Button asChild className="w-full">
            <a href={booking.meetUrl}>Join Google Meet</a>
          </Button>
        ) : null}
      </Shell>
    )
  }
  return (
    <Shell title={booking.title} description={`${booking.host.name ?? 'Igani'} invited ${booking.guestName} to meet on ${when}.`}>
      {booking.notes ? <p className="mb-4 text-sm text-muted-foreground">{booking.notes}</p> : null}
      <ConfirmInviteButton token={token} />
    </Shell>
  )
}
