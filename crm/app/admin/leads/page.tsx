import { redirect } from 'next/navigation'

/** Old admin contacts URL: there is one contact directory now, so keep links and bookmarks working. */
export default async function AdminLeadsPage(
  props: { searchParams: Promise<Record<string, string | string[] | undefined>> }
): Promise<never> {
  const searchParams = await props.searchParams;
  const q = new URLSearchParams(Object.entries(searchParams).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])))
  redirect(`/sales/leads${q.size ? `?${q}` : ''}`)
}
