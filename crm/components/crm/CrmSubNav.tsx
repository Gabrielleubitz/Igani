import Link from 'next/link'

const TABS = [
  { href: '/sales/leads', label: 'Contacts' },
  { href: '/sales', label: 'Pipeline' },
  { href: '/sales/board', label: 'Board' },
  { href: '/sales/tasks', label: 'Tasks' },
  { href: '/sales/reports', label: 'Reports' },
]

export function CrmSubNav({ active }: { active: string }): React.ReactElement {
  return (
    <div className="mb-6 flex gap-1 border-b">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${active === t.href ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  )
}
