import { AvailabilityForm, type DayHours } from '@/components/AvailabilityForm'
import { ConnectGoogleButton, UnverifiedAppHint } from '@/components/ConnectGoogle'
import { requireUser } from '@/lib/auth'
import { PageIntro } from '@/components/PageIntro'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'My availability' }

export default async function AvailabilityPage(): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const [me, rules, googleConnected] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
    prisma.availability.findMany({ where: { hostId: user.id }, orderBy: { startTime: 'asc' } }),
    prisma.account.findFirst({ where: { userId: user.id, provider: 'google', refresh_token: { not: null } }, select: { id: true } }),
  ])
  const days: DayHours[] = Array.from({ length: 7 }, (_, day) => {
    const r = rules.find((x) => x.dayOfWeek === day)
    return r ? { enabled: true, startTime: r.startTime, endTime: r.endTime } : { enabled: false, startTime: '09:00', endTime: '17:00' }
  })
  return (
    <div className="space-y-6">
      <PageIntro title="My availability" hint="When people can book you. Bookable times = these hours minus anything busy on your Google Calendar (and at least an hour from now)." />
      {!googleConnected ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm">
          <span>
            Connect Google so bookable times skip what&apos;s busy on your calendar and booked meetings get a Meet link. Until you do, online booking won&apos;t work for you.
            <UnverifiedAppHint />
          </span>
          <ConnectGoogleButton callbackUrl="/sales/availability" />
        </div>
      ) : null}
      <AvailabilityForm timeZone={me.timeZone} days={days} />
    </div>
  )
}
