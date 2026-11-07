import { AudioLines, CircleDot, FlaskConical, KeyRound, ShieldCheck, Video } from 'lucide-react'
import { NewMeetForm, RoomCard, type RoomView } from '@/components/meet/MeetAdmin'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GradientChip, IconChip, Tag } from '@/components/ui/tone'
import { requireUser } from '@/lib/auth'
import { appUrl } from '@/lib/env'
import { cloudinaryConfigured } from '@/lib/cloudinary'
import { meetAvailable, meetConfigured, meetRecordingReady, meetSetupProblem } from '@/lib/meet'
import { recordingState } from '@/lib/meet-recording'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Tests' }
export const dynamic = 'force-dynamic'

/** Features being tried out before they go to the whole team. First up: Igani Meet, video calls inside the CRM. */
export default async function TestsPage(): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN'])
  const [me, team, rooms] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
    prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES', 'MARKETING'] }, email: { not: null }, NOT: { id: user.id } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.meetRoom.findMany({ orderBy: [{ endedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }], take: 40, include: { host: { select: { name: true, email: true } }, invites: { orderBy: { createdAt: 'asc' } }, recordings: { orderBy: { createdAt: 'desc' } } } }),
  ])
  const configured = meetConfigured()
  const problem = meetSetupProblem()
  const ready = meetAvailable()
  const recording = meetRecordingReady()
  const storage = cloudinaryConfigured()
  const now = new Date()
  const mins = (sec: number | null): string | null => (sec == null ? null : sec < 60 ? `${sec}s` : `${Math.floor(sec / 3600) ? `${Math.floor(sec / 3600)}h ` : ''}${Math.round((sec % 3600) / 60)} min`)
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: me.timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const teammates = team.map((t) => ({ id: t.id, name: t.name ?? t.email!, email: t.email!.toLowerCase() }))
  const views: RoomView[] = rooms.map((r) => ({
    id: r.id,
    code: r.code,
    title: r.title,
    when: r.scheduledAt ? fmt.format(r.scheduledAt) : null,
    durationMin: r.durationMin,
    ended: Boolean(r.endedAt),
    hostName: r.host?.name ?? r.host?.email ?? 'Former teammate',
    recordings: r.recordings.map((c) => ({
      id: c.id,
      when: fmt.format(c.startedAt ?? c.createdAt),
      duration: mins(c.durationSec),
      state: recordingState(c, now),
      note: c.error,
      until: c.sourceUntil ? fmt.format(c.sourceUntil) : null,
    })),
    invites: r.invites.map((i) => ({ id: i.id, email: i.email, name: i.name, teammate: Boolean(i.userId), link: appUrl(`/meet/${r.code}?t=${encodeURIComponent(i.token)}`), sent: Boolean(i.sentAt), error: i.sendError, joined: Boolean(i.joinedAt) })),
  }))

  return (
    <div className="space-y-6">
      <PageIntro title="Tests" icon={FlaskConical} tone="orange" hint="New features being tried out before the whole team gets them." />

      <Card>
        <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0 pb-3">
          <GradientChip tone="blue">
            <Video />
          </GradientChip>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg">Igani Meet</CardTitle>
            <p className="text-sm text-muted-foreground">Video calls inside the CRM, in Igani’s look. Invite teammates or anyone by email: guests join from their browser, no account or app.</p>
          </div>
          {configured && recording ? <Tag tone="rose">● Recording on</Tag> : null}
          {configured ? <Tag tone="emerald">Connected to 8x8</Tag> : problem ? <Tag tone="rose">8x8 settings need fixing</Tag> : ready ? <Tag tone="amber">Test server (this computer only)</Tag> : <Tag tone="rose">Not set up</Tag>}
        </CardHeader>
        <CardContent className="space-y-5">
          {problem ? (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-rose-100">
                <KeyRound className="h-4 w-4 text-rose-300" /> Calls can’t connect until this is fixed
              </div>
              <p className="mt-1.5 text-rose-100/90">{problem}</p>
              <p className="mt-1.5 text-xs text-rose-100/70">Change it in Vercel → Settings → Environment Variables, then redeploy.</p>
            </div>
          ) : !configured ? (
            <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <KeyRound className="h-4 w-4 text-amber-300" /> To turn it on for everyone
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Create a free account at jaas.8x8.vc (Jitsi as a Service).</li>
                <li>In its console, open API Keys and add a key. Download the private key file.</li>
                <li>
                  In Vercel, add <code className="text-foreground">JAAS_APP_ID</code> (starts with vpaas-magic-cookie-), <code className="text-foreground">JAAS_KEY_ID</code> (the key’s id) and <code className="text-foreground">JAAS_PRIVATE_KEY</code> (the whole private key file), then redeploy.
                </li>
              </ol>
              {ready ? <p className="mt-2 text-xs text-amber-200/80">Until then, calls on this computer use Jitsi’s public test server, which limits embedded calls to a few minutes.</p> : null}
            </div>
          ) : null}
          {configured && !recording ? (
            <div className="rounded-xl border border-sky-400/30 bg-sky-500/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CircleDot className="h-4 w-4 text-rose-400" /> Turn on recording
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>
                  In the 8x8 console, open Webhooks and add an endpoint: <code className="break-all text-foreground">{appUrl('/api/public/meet/webhook')}</code>, with the event <span className="text-foreground">Recording uploaded</span>.
                </li>
                <li>
                  Reveal its signing secret and add it in Vercel as <code className="text-foreground">JAAS_WEBHOOK_SECRET</code>, then redeploy.
                </li>
                <li>Recording must be switched on for your 8x8 app (it’s billed per minute by 8x8).</li>
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">Then a record button appears for you (hosts only) during calls. Everyone in the call sees and hears when it’s recording.</p>
            </div>
          ) : null}
          {recording && !storage ? (
            <p className="rounded-xl border border-amber-400/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/90">Recording is on, but Cloudinary isn’t set up for the CRM, so recordings are only kept by 8x8 for 24 hours. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Vercel to keep them.</p>
          ) : null}
          <NewMeetForm teammates={teammates} ready={ready} />
          <div className="grid gap-3 border-t pt-4 text-xs text-muted-foreground sm:grid-cols-3">
            <p className="flex gap-2">
              <IconChip tone="emerald" size="sm">
                <ShieldCheck />
              </IconChip>
              Only invited people get in: each person’s link carries their own pass. Ending a call stops every link.
            </p>
            <p className="flex gap-2">
              <IconChip tone="violet" size="sm">
                <AudioLines />
              </IconChip>
              One-to-one calls connect browser to browser for the lowest delay; group calls go through 8x8’s servers.
            </p>
            <p className="flex gap-2">
              <IconChip tone="sky" size="sm">
                <Video />
              </IconChip>
              Up to 720p, with screen sharing, chat, background blur, raised hands, a grid view{recording ? ' and recording' : ''}.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Calls</h2>
        {views.length ? (
          <ul className="space-y-3">
            {views.map((r) => (
              <RoomCard key={r.id} room={r} teammates={teammates} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No calls yet. Create one above.</p>
        )}
      </section>
    </div>
  )
}
