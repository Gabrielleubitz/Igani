import { AvailabilityForm, type DayHours } from '@/components/AvailabilityForm'
import { requireUser } from '@/lib/auth'
import { PageIntro } from '@/components/PageIntro'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'My hours' }

export default async function AvailabilityPage(): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const [me, rules] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
    prisma.availability.findMany({ where: { hostId: user.id }, orderBy: { startTime: 'asc' } }),
  ])
  const days: DayHours[] = Array.from({ length: 7 }, (_, day) => {
    const r = rules.find((x) => x.dayOfWeek === day)
    return r ? { enabled: true, startTime: r.startTime, endTime: r.endTime } : { enabled: false, startTime: '09:00', endTime: '17:00' }
  })
  return (
    <div className="space-y-6">
      <PageIntro title="My hours" hint="When people can book you. Bookable times = these hours minus anything busy on your Google Calendar (and at least an hour from now)." />
      <AvailabilityForm timeZone={me.timeZone} days={days} />
    </div>
  )
}
