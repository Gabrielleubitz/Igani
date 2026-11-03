 
import { CalendarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, RepeatIcon, type LucideProps } from 'lucide-react'

const ICONS = { CalendarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, RepeatIcon }

type Props = LucideProps & { lucide: keyof typeof ICONS; tabler?: string; hugeicons?: string; phosphor?: string; remixicon?: string }

/** The registry ships a multi-icon-library placeholder; the CRM only uses lucide. */
export function IconPlaceholder({ lucide, tabler: _t, hugeicons: _h, phosphor: _p, remixicon: _r, ...props }: Props): React.ReactElement {
  const Icon = ICONS[lucide]
  return <Icon aria-hidden="true" {...props} />
}
