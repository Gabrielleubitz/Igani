'use client'

import { ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/multi-level-collapsible-menu-utils/collapsible'
import { ItemMedia, ItemTitle, itemVariants } from '@/components/ui/multi-level-collapsible-menu-utils/item'
import { cn } from '@/lib/utils'

export type MenuNode = {
  id: string
  label: string
  icon?: ReactElement
  /** A link. Folders (nodes with children) have no href. */
  href?: string
  badge?: number
  children?: MenuNode[]
}

function leaves(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap((n) => (n.children?.length ? leaves(n.children) : [n]))
}

/** The one link that matches the current URL best (the longest matching href), so a parent path never lights up with its child. */
function activeHref(nodes: MenuNode[], pathname: string): string | null {
  let best: string | null = null
  for (const n of leaves(nodes)) {
    const h = n.href
    if (h && (pathname === h || pathname.startsWith(`${h}/`)) && (!best || h.length > best.length)) best = h
  }
  return best
}

const containsActive = (n: MenuNode, active: string | null): boolean => (n.href ? n.href === active : (n.children ?? []).some((c) => containsActive(c, active)))
const badgeOf = (n: MenuNode): number => (n.children?.length ? n.children.reduce((sum, c) => sum + badgeOf(c), 0) : (n.badge ?? 0))

function Badge({ count }: { count: number }): ReactElement | null {
  return count > 0 ? <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground">{count}</span> : null
}

function MenuItem({ node, level, active, expanded }: { node: MenuNode; level: number; active: string | null; expanded: boolean }): ReactElement {
  const isFolder = !!node.children?.length
  const hasActive = containsActive(node, active)
  // Folders start closed when the site opens, even the one holding the current page (`expanded` opens them on request)
  const [open, setOpen] = useState(expanded)
  // Moving to a page inside a folder later opens it (the user can still close it afterwards); the first render is skipped so nothing starts open
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (hasActive) setOpen(true)
  }, [hasActive])
  const pad = { paddingLeft: `${level * 12 + 8}px` }

  if (isFolder) {
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
        <CollapsibleTrigger asChild>
          <button type="button" style={pad} className={cn(itemVariants({ size: 'xs' }), 'group/item cursor-pointer rounded-sm py-2 text-foreground/75 hover:bg-muted hover:text-foreground', hasActive && 'text-foreground')}>
            {node.icon ? (
              <ItemMedia variant="icon">
                <span aria-hidden className="size-4 [&>svg]:size-4">
                  {node.icon}
                </span>
              </ItemMedia>
            ) : null}
            <ItemTitle className={cn('text-sm font-medium', hasActive && 'font-semibold')}>{node.label}</ItemTitle>
            {!open ? <Badge count={badgeOf(node)} /> : null}
            <ChevronRightIcon aria-hidden className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden pt-0.5 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="flex flex-col gap-0.5">
            {node.children!.map((c) => (
              <MenuItem key={c.id} node={c} level={level + 1} active={active} expanded={expanded} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    )
  }

  const isActive = node.href === active
  return (
    <Link
      href={node.href ?? '#'}
      aria-current={isActive ? 'page' : undefined}
      style={pad}
      className={cn(itemVariants({ size: 'xs' }), 'group/item rounded-sm py-2', isActive ? 'bg-primary/10 font-semibold text-primary' : 'font-medium text-foreground/75 hover:bg-muted hover:text-foreground')}
    >
      <ItemMedia variant="icon">
        <span aria-hidden className={cn('size-4 [&>svg]:size-4', isActive && 'text-primary')}>
          {node.icon}
        </span>
      </ItemMedia>
      <ItemTitle className="text-sm font-[inherit]">{node.label}</ItemTitle>
      <Badge count={node.badge ?? 0} />
    </Link>
  )
}

/** The sidebar menu: folders open and close, nested to any depth; all start closed, and the page you are on is highlighted. */
export function NavMenu({ nodes, expanded = false, label = 'Main' }: { nodes: MenuNode[]; expanded?: boolean; label?: string }): ReactElement {
  const pathname = usePathname() ?? ''
  const active = useMemo(() => activeHref(nodes, pathname), [nodes, pathname])
  return (
    <nav aria-label={label} className="flex flex-col gap-0.5">
      {nodes.map((n) => (
        <MenuItem key={n.id} node={n} level={0} active={active} expanded={expanded} />
      ))}
    </nav>
  )
}
