import Link from 'next/link'
import { BrandedPage } from '@/components/brand/BrandedPage'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound(): React.ReactElement {
  return (
    <BrandedPage>
      <div className="text-center">
        <p className="text-sm font-medium text-primary">404</p>
        <h1 className="mt-1 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page does not exist or is no longer available.</p>
        <Link href="/" className={`${buttonVariants()} mt-6`}>
          Back to Igani CRM
        </Link>
      </div>
    </BrandedPage>
  )
}
