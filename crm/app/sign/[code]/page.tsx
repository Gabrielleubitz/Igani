import { CommissionSign } from '@/components/CommissionSign'

export const metadata = { title: 'Sales commission agreement | Igani', robots: { index: false, follow: false }, referrer: 'no-referrer' as const }

/** Public signing page: /sign/<short code>. The agreement is looked up server-side and is kept for at most 12 hours. */
export default async function Page(props: { params: Promise<{ code: string }> }): Promise<React.ReactElement> {
  const { code } = await props.params
  return <CommissionSign code={code} />
}
