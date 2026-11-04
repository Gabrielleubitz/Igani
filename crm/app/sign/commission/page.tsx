import { CommissionSign } from '@/components/CommissionSign'

export const metadata = { title: 'Sales commission agreement | Igani', robots: { index: false, follow: false }, referrer: 'no-referrer' as const }

/** Public signing page. The token is in the URL fragment (#), which browsers never send to the server. */
export default function Page(): React.ReactElement {
  return <CommissionSign />
}
