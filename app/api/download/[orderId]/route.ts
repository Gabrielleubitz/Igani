import { NextRequest, NextResponse } from 'next/server'

// Ensure this route is not statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Dynamic imports to prevent build-time issues
async function getDependencies() {
  const { prisma } = await import('@/lib/prisma')
  const { StorageService } = await import('@/lib/storage')
  return { prisma, StorageService }
}

interface RouteContext {
  params: Promise<{
    orderId: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const { orderId } = params

    // Get dependencies dynamically
    const { prisma, StorageService } = await getDependencies()

    // Get order with generated content
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        generatedCopy: true,
        delivery: true
      }
    })

    if (!order || order.status !== 'PAID' || !order.generatedCopy) {
      return NextResponse.json(
        { error: 'Order not found or not paid' },
        { status: 404 }
      )
    }

    // Check if ZIP already exists
    if (order.delivery?.zipUrl) {
      return NextResponse.redirect(order.delivery.zipUrl)
    }

    // Generate ZIP package
    const storageService = new StorageService()
    const zipUrl = await storageService.createZipPackage(orderId, {
      site: order.generatedCopy.site,
      emails: order.generatedCopy.emails,
      sms: order.generatedCopy.sms,
      theme: order.generatedCopy.theme,
      brandName: (order.generatedCopy.site as any)?.brandName || 'Event Site'
    })

    // Update delivery record
    await prisma.delivery.upsert({
      where: { orderId },
      create: {
        orderId,
        method: 'ZIP',
        zipUrl
      },
      update: {
        zipUrl
      }
    })

    return NextResponse.redirect(zipUrl)

  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Failed to generate download' },
      { status: 500 }
    )
  }
}