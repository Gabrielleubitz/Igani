import { getTeamMembers } from '@/lib/firestore'
import { TeamMember } from '@/types'
import { siteContent } from '@/lib/i18n'
import { SITE_URL } from '@/lib/seo/site'

const about = siteContent.aboutPage

/** Static co-founder profiles — used for SEO when Firebase is empty or incomplete. */
export const STATIC_FOUNDERS: Pick<TeamMember, 'name' | 'position' | 'bio'>[] = [
  {
    name: 'Ilan Leubitz',
    position: 'Founder & CEO',
    bio: 'Ilan Leubitz is the Founder & CEO of IGANI, leading product, engineering, and brand across web development and digital products.',
  },
  {
    name: about.amitayName.en,
    position: about.amitayRole.en,
    bio: about.amitayBio.en,
  },
  {
    name: about.gabrielName.en,
    position: about.gabrielRole.en,
    bio: about.gabrielBio.en,
  },
]

export type FounderProfile = {
  name: string
  position: string
  bio: string
  linkedinUrl?: string
  imageUrl?: string
}

/** Published team members from Firebase, falling back to static co-founders. */
export async function getFounderProfiles(): Promise<FounderProfile[]> {
  try {
    const team = await getTeamMembers()
    const published = team.filter((m) => m.published && m.name.trim())
    if (published.length > 0) {
      return published.map((m) => ({
        name: m.name,
        position: m.position,
        bio: m.bio,
        linkedinUrl: m.linkedinUrl,
        imageUrl: m.imageUrl,
      }))
    }
  } catch {
    // fall through to static list
  }
  return STATIC_FOUNDERS
}

export function founderSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function founderProfileUrl(name: string): string {
  return `${SITE_URL}/about/team/${founderSlug(name)}`
}

export async function getFounderBySlug(slug: string): Promise<FounderProfile | null> {
  const founders = await getFounderProfiles()
  return founders.find((f) => founderSlug(f.name) === slug) ?? null
}

export function buildFounderKeywords(founders: FounderProfile[]): string[] {
  const base = [
    'IGANI',
    'Igani',
    'web development',
    'product studio',
    'about IGANI',
    'IGANI team',
    'IGANI founders',
    'IGANI co-founders',
  ]

  for (const founder of founders) {
    base.push(founder.name)
    base.push(`${founder.name} IGANI`)
    base.push(`${founder.name} Igani`)
    const parts = founder.name.split(/\s+/)
    if (parts.length >= 2) {
      base.push(`${parts[parts.length - 1]} IGANI`)
    }
  }

  return Array.from(new Set(base))
}
