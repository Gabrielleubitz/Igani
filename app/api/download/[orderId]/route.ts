import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { StorageService } from '@/lib/storage'

// Ensure this route is not statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{
    orderId: string
  }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const params = await context.params
    const { orderId } = params

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