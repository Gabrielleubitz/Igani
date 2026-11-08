import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/payouts' }))

import { NavMenu, type MenuNode } from '@/components/ui/multi-level-collapsible-menu'

const nodes: MenuNode[] = [
  { id: 'home', label: 'Overview', href: '/admin/dashboard' },
  { id: 'money', label: 'Money', children: [{ id: 'payouts', label: 'Payouts', href: '/admin/payouts' }, { id: 'offers', label: 'Offers', href: '/admin/offers' }] },
  { id: 'team', label: 'Team', children: [{ id: 'people', label: 'People', href: '/admin/team' }] },
]

describe('the sidebar menu', () => {
  it('starts with every folder closed, even the one that holds the current page', () => {
    const html = renderToStaticMarkup(createElement(NavMenu, { nodes }))
    expect(html).toContain('data-state="closed"')
    expect(html).not.toContain('data-state="open"')
    // The folder titles are there; the pages inside the folders are not shown until a folder is opened
    expect(html).toContain('Money')
    expect(html).not.toContain('Payouts')
  })
  it('can still be asked to start open', () => {
    const html = renderToStaticMarkup(createElement(NavMenu, { nodes, expanded: true }))
    expect(html).toContain('Payouts')
  })
})
