import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import type Stripe from 'stripe'

// Ensure this route is not statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Dynamic imports to prevent build-time issues
async function getDependencies() {
  const Stripe = (await import('stripe')).default
  const { prisma } = await import('@/lib/prisma')
  return { Stripe, prisma }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')
    
    // Get dependencies dynamically
    const { Stripe, prisma } = await getDependencies()
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16'
    })
    
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId
        const planId = session.metadata?.planId

        if (!orderId) {
          console.error('Missing orderId in session metadata')
          break
        }

        try {
          // Update order status
          const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { 
              status: 'PAID',
              amount: session.amount_total || 0
            },
            include: { customer: true }
          })

          // Update customer info if available
          if (session.customer_details?.email && session.customer_details?.name) {
            await prisma.customer.update({
              where: { id: updatedOrder.customerId },
              data: {
                email: session.customer_details.email,
                name: session.customer_details.name
              }
            })
          }

          // Create license
          if (planId) {
            await prisma.license.create({
              data: {
                orderId: orderId,
                key: generateLicenseKey(),
                plan: planId
              }
            })
          }

          // Trigger copy generation
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-copy`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId })
          })

          // Trigger delivery process
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/create-repo`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ orderId })
          })

          console.log(`Successfully processed payment for order: ${orderId}`)
        } catch (error) {
          console.error('Error processing successful payment:', error)
        }
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'FAILED' }
          })
          console.log(`Order ${orderId} marked as failed due to expired checkout`)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const orderId = paymentIntent.metadata?.orderId

        if (orderId) {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'FAILED' }
          })
          console.log(`Order ${orderId} marked as failed due to payment failure`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) result += '-'
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}