import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BarChart3,
  Calendar,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Globe,
  Heart,
  Home,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  User,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import type { ReactNode } from 'react'

/**
 * Shared pieces for offer blocks. Blocks are display-only lego bricks: plain props in, markup out.
 * Rules every block follows (and Claude must keep when composing):
 *  - no data fetching, no auth, no app state beyond tiny UI toggles
 *  - colours: neutral slate + the offer accent `var(--offer-accent)`; `tone="dark"` for dark surfaces
 *  - right-to-left safe: logical spacing only (ms/me/ps/pe/start/end/text-start)
 *  - icons by name (see ICONS), images by path (/offers/<slug>/...) or a neutral placeholder
 */

export const ICONS = {
  arrowLeft: ArrowLeft,
  arrowRight: ArrowRight,
  bell: Bell,
  chart: BarChart3,
  calendar: Calendar,
  camera: Camera,
  check: Check,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  clock: Clock,
  card: CreditCard,
  file: FileText,
  globe: Globe,
  heart: Heart,
  home: Home,
  dashboard: LayoutDashboard,
  lock: Lock,
  mail: Mail,
  pin: MapPin,
  chat: MessageCircle,
  package: Package,
  phone: Phone,
  search: Search,
  settings: Settings,
  shield: ShieldCheck,
  bag: ShoppingBag,
  sparkles: Sparkles,
  star: Star,
  truck: Truck,
  user: User,
  users: Users,
  wallet: Wallet,
  zap: Zap,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export function Icon({ name, className }: { name: IconName | undefined; className?: string }): React.ReactElement | null {
  const C = name ? ICONS[name] : undefined
  return C ? <C className={className} aria-hidden /> : null
}

export type Tone = 'light' | 'dark'

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** Surface colours per tone. */
export const surface = (tone: Tone = 'light'): { bg: string; card: string; text: string; muted: string; border: string } =>
  tone === 'dark'
    ? { bg: 'bg-slate-950', card: 'bg-white/5', text: 'text-white', muted: 'text-slate-400', border: 'border-white/10' }
    : { bg: 'bg-white', card: 'bg-white', text: 'text-slate-900', muted: 'text-slate-500', border: 'border-slate-200' }

/** A picture, or a neutral accent-tinted placeholder when there is none (mockups often come before real photos). */
export function Picture({ src, alt = '', className, sizes = '600px' }: { src?: string; alt?: string; className?: string; sizes?: string }): React.ReactElement {
  if (!src)
    return (
      <div
        aria-hidden
        className={cx('bg-[linear-gradient(135deg,color-mix(in_srgb,var(--offer-accent)_22%,white),color-mix(in_srgb,var(--offer-accent)_6%,white))]', className)}
      />
    )
  return (
    <div className={cx('relative overflow-hidden', className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  )
}

export function AccentButton({ children, variant = 'solid', className }: { children: ReactNode; variant?: 'solid' | 'outline' | 'ghost'; className?: string }): React.ReactElement {
  return (
    <span
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold',
        variant === 'solid' && 'bg-[var(--offer-accent)] text-white',
        variant === 'outline' && 'border border-slate-300 bg-white text-slate-800',
        variant === 'ghost' && 'text-[var(--offer-accent)]',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Pill({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'neutral' | 'success' | 'warning' | 'danger' }): React.ReactElement {
  const t = {
    accent: 'bg-[color-mix(in_srgb,var(--offer-accent)_12%,white)] text-[var(--offer-accent)]',
    neutral: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
  }[tone]
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', t)}>{children}</span>
}

export function Avatar({ name, src, size = 36 }: { name: string; src?: string; size?: number }): React.ReactElement {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
  return src ? (
    <span className="relative inline-block shrink-0 overflow-hidden rounded-full" style={{ width: size, height: size }}>
      <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" />
    </span>
  ) : (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--offer-accent)_15%,white)] font-semibold text-[var(--offer-accent)]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  )
}
