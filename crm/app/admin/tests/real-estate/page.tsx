import { RealEstateDemo } from '@/components/demo/RealEstateDemo'
import { requireUser } from '@/lib/auth'

export const metadata = { title: 'Real estate demo' }

/** The real-estate edition, shown with demo data (Admin → Tests). */
export default async function RealEstateDemoPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  return <RealEstateDemo />
}
