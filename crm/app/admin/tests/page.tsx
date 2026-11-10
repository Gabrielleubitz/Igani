import { ArrowRight, Building2, FlaskConical, Video } from 'lucide-react'
import Link from 'next/link'
import { PageIntro } from '@/components/PageIntro'
import { GradientChip, Tag, type Tone } from '@/components/ui/tone'
import { requireUser } from '@/lib/auth'

export const metadata = { title: 'Tests' }

const TESTS: { href: string; title: string; body: string; tag: string; tagTone: Tone; tone: Tone; icon: React.ReactElement }[] = [
  {
    href: '/admin/tests/real-estate',
    title: 'Real estate CRM demo',
    body: 'A walkthrough for real-estate CEOs: what admins and agents see, the in-person meeting recorder, properties pulled from calls, coached video meetings, listen-in with notes, and auto summaries and tasks. Demo data, with a Present button for full screen.',
    tag: 'New',
    tagTone: 'emerald',
    tone: 'blue',
    icon: <Building2 />,
  },
  {
    href: '/meet',
    title: 'Igani Meet',
    body: 'Branded video calls on our own link. Started here, now open to the whole team.',
    tag: 'Graduated',
    tagTone: 'slate',
    tone: 'violet',
    icon: <Video />,
  },
]

/** Features and demos being tried out before the team (or clients) see them. */
export default async function TestsPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  return (
    <div className="space-y-6">
      <PageIntro title="Tests" icon={FlaskConical} tone="orange" hint="New features and demos being tried out before the whole team, or a client, sees them." />
      <div className="grid gap-4 md:grid-cols-2">
        {TESTS.map((t) => (
          <Link key={t.href} href={t.href} className="group flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
            <div className="flex items-center gap-3">
              <GradientChip tone={t.tone}>{t.icon}</GradientChip>
              <h2 className="text-lg font-semibold">{t.title}</h2>
              <Tag tone={t.tagTone} className="ml-auto">
                {t.tag}
              </Tag>
            </div>
            <p className="flex-1 text-sm text-muted-foreground">{t.body}</p>
            <span className="flex items-center gap-1 text-sm font-medium text-primary">
              Open <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
