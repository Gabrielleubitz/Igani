import {
  Archive,
  Blocks,
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  FileSignature,
  FileText,
  Globe,
  LayoutDashboard,
  Link as LinkIcon,
  ListChecks,
  Megaphone,
  Phone,
  PhoneCall,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareCheck,
  SquareKanban,
  UserCog,
  Users,
  Video,
  type LucideIcon,
  MessagesSquare,
} from 'lucide-react'
import { GradientChip, type Tone } from '@/components/ui/tone'

/** Each page's badge: the same icon as its menu entry, in its section's color. */
const PAGE_BADGE: Record<string, { icon: LucideIcon; tone: Tone }> = {
  Leads: { icon: Users, tone: 'blue' },
  'Team chat': { icon: MessagesSquare, tone: 'pink' },
  'Archived leads': { icon: Archive, tone: 'slate' },
  Board: { icon: SquareKanban, tone: 'indigo' },
  Tasks: { icon: SquareCheck, tone: 'emerald' },
  Analytics: { icon: ChartColumn, tone: 'sky' },
  Meetings: { icon: CalendarDays, tone: 'violet' },
  'Book meeting with team': { icon: Users, tone: 'violet' },
  'Send meeting invite': { icon: Send, tone: 'pink' },
  Calls: { icon: PhoneCall, tone: 'emerald' },
  'Call lists': { icon: ListChecks, tone: 'teal' },
  'Control of the call': { icon: Video, tone: 'rose' },
  Documents: { icon: FileText, tone: 'cyan' },
  Overview: { icon: LayoutDashboard, tone: 'blue' },
  Offers: { icon: FileSignature, tone: 'amber' },
  'Offer blocks': { icon: Blocks, tone: 'amber' },
  Bookings: { icon: CalendarCheck, tone: 'violet' },
  'Booking pages': { icon: LinkIcon, tone: 'cyan' },
  Website: { icon: Globe, tone: 'cyan' },
  Videos: { icon: Video, tone: 'rose' },
  'Sales contracts': { icon: FileSignature, tone: 'emerald' },
  'Audit log': { icon: ScrollText, tone: 'sky' },
  'Sales team': { icon: UserCog, tone: 'indigo' },
  'Team access': { icon: ShieldCheck, tone: 'indigo' },
  Phone: { icon: Phone, tone: 'emerald' },
  Settings: { icon: Settings, tone: 'slate' },
  Marketing: { icon: Megaphone, tone: 'pink' },
}

function badgeFor(title: string): { icon: LucideIcon; tone: Tone } | null {
  if (title.startsWith('Studio')) return { icon: Sparkles, tone: 'amber' }
  return PAGE_BADGE[title] ?? null
}

/**
 * Page title with a one-line plain-English explanation of what the page is for, and the page's gradient badge.
 * `icon` / `tone` override the badge (pages named after a person or a record have none by default).
 */
export function PageIntro({ title, hint, className = '', icon, tone }: { title: string; hint: string; className?: string; icon?: LucideIcon; tone?: Tone }): React.ReactElement {
  const known = badgeFor(title)
  const Icon = icon ?? known?.icon
  const t = tone ?? known?.tone ?? 'blue'
  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {Icon ? (
        <GradientChip tone={t} className="mt-0.5">
          <Icon />
        </GradientChip>
      ) : null}
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[32px]">{title}</h1>
        <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">{hint}</p>
      </div>
    </div>
  )
}
