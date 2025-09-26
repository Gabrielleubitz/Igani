import { AdminDashboard } from '@/components/AdminDashboard'

export const dynamic = 'force-dynamic'

async function getOrders() {
  const { prisma } = await import('@/lib/prisma')
  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      questionnaire: true,
      generatedCopy: true,
      delivery: true,
      license: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return orders
}

export default async function AdminPage() {
  const orders = await getOrders()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Admin Dashboard
          </h1>
          <p className="text-slate-600">
            Manage orders and monitor system health.
          </p>
        </div>

        <AdminDashboard orders={orders} />
      </div>
    </div>
  )
}