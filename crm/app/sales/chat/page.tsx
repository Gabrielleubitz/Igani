import { redirect } from 'next/navigation'
import { chatOpenDm, chatOverview } from '@/app/actions/chat'
import { TeamChat } from '@/components/chat/TeamChat'
import { PageIntro } from '@/components/PageIntro'

export const metadata = { title: 'Team chat' }
export const dynamic = 'force-dynamic'

export default async function ChatPage(props: { searchParams: Promise<Record<string, string | undefined>> }): Promise<React.ReactElement> {
  const { c, dm } = await props.searchParams
  // ?dm=<teammate id> opens the direct conversation with them (made the first time)
  const opened = dm ? await chatOpenDm(dm) : null
  const r = await chatOverview()
  if (!r.ok) redirect('/sales/today')
  const want = opened?.ok ? opened.data.id : c
  const linked = want && r.data.channels.some((x) => x.id === want) ? want : null
  return (
    <div className="space-y-4">
      <PageIntro title="Team chat" hint="Talk with the team: channels for topics and clients, and direct messages." className="hidden sm:flex" />
      <TeamChat initial={r.data} initialChannelId={linked} />
    </div>
  )
}
