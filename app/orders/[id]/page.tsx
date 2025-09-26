import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { OrderPortal } from '@/components/OrderPortal'

// Ensure this page is not statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface OrderPageProps {
  params: Promise<{
    id: string
  }>
}

async function getOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      questionnaire: true,
      generatedCopy: true,
      delivery: true,
      license: true
    }
  })

  if (!order || order.status !== 'PAID') {
    return null
  }

  return order
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              Your Event Site is Ready!
            </h1>
            <p className="text-slate-600">
              Here's everything you need to deploy your event site.
            </p>
          </div>

          <OrderPortal order={order} />
        </div>
      </div>
    </div>
  )
}