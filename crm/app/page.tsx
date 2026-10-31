import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home(): Promise<never> {
  const user = await requireUser()
  redirect(user.role === 'MARKETING' ? '/marketing' : '/sales/today')
}
