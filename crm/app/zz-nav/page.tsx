import { AppNav, type NavNode } from '@/components/AppNav'
const nodes: NavNode[] = [
  { id: 'today', label: 'Today', icon: 'today', href: '/sales/today' },
  { id: 'sales', label: 'Sales', icon: 'contacts', children: [{ id: 'leads', label: 'Leads', icon: 'contacts', href: '/sales/leads' }, { id: 'board', label: 'Board', icon: 'board', href: '/sales/board' }] },
  { id: 'admin', label: 'Admin', icon: 'overview', children: [{ id: 'overview', label: 'Overview', icon: 'overview', href: '/admin/dashboard' }, { id: 'clients', label: 'Clients & offers', icon: 'offers', children: [{ id: 'offers', label: 'Offers', icon: 'offers', href: '/admin/offers' }, { id: 'bookings', label: 'Bookings', icon: 'bookings', href: '/admin/bookings', badge: 3 }] }] },
]
export default function Page(): React.ReactElement {
  return <div className="w-64 border-r bg-card/40 p-4"><AppNav nodes={nodes} /></div>
}
