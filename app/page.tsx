import type { Metadata, ResolvingMetadata } from 'next'
import { NewHome } from '@/app/components/home/NewHome'
import { getSettings, getTeamMembers, orderFounders } from '@/lib/firestore'
import type { SiteSettings, TeamMember } from '@/types'

// Rebuild the home page from Firestore every few minutes, so the team and contact details are real text in the HTML.
export const revalidate = 300

// Title and description come from the admin Site Settings (root layout); this only adds the home page's own canonical and og:url.
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const p = await parent
  return {
    alternates: { canonical: '/' },
    openGraph: { ...p.openGraph, url: '/' },
  }
}

/** Never let a slow or unreachable Firestore hold the page up: after a few seconds the browser fetches it instead. */
const within = <T,>(work: Promise<T>, ms = 4000): Promise<T | undefined> =>
  Promise.race([work, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]).catch(() => undefined)

export default async function HomePage() {
  const [team, settings] = await Promise.all([within(getTeamMembers()), within(getSettings())])
  const initialTeam: TeamMember[] | undefined = team ? orderFounders(team.filter((m) => m.published)) : undefined
  // Plain JSON only: Firestore values (timestamps) cannot cross into the browser as they are.
  const initialSettings: SiteSettings | null | undefined = settings ? (JSON.parse(JSON.stringify(settings)) as SiteSettings) : undefined
  return <NewHome initialTeam={initialTeam} initialSettings={initialSettings} />
}
