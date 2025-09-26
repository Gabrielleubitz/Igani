'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { QuestionnaireData } from './types'

// Dynamic imports to prevent build-time issues
async function getDependencies() {
  const Stripe = (await import('stripe')).default
  const { prisma } = await import('./prisma')
  const { plans } = await import('./types')
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16'
  })
  return { stripe, prisma, plans }
}

export async function createOrder() {
  try {
    const { prisma } = await getDependencies()
    const order = await prisma.order.create({
      data: {
        status: 'DRAFT',
        amount: 0,
        currency: 'usd',
        customer: {
          create: {
            name: '',
            email: ''
          }
        }
      }
    })

    return order
  } catch (error) {
    console.error('Error creating order:', error)
    throw new Error('Failed to create order')
  }
}

export async function saveQuestionnaire(orderId: string, data: QuestionnaireData) {
  try {
    const { prisma } = await getDependencies()
    await prisma.questionnaire.upsert({
      where: { orderId },
      create: {
        orderId,
        answers: data
      },
      update: {
        answers: data
      }
    })

    revalidatePath(`/orders/${orderId}`)
    return { success: true }
  } catch (error) {
    console.error('Error saving questionnaire:', error)
    throw new Error('Failed to save questionnaire')
  }
}

export async function createCheckoutSession(orderId: string, planId: string) {
  try {
    const { stripe, prisma, plans } = await getDependencies()
    const plan = plans.find(p => p.id === planId)
    if (!plan) {
      throw new Error('Invalid plan')
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true }
    })

    if (!order) {
      throw new Error('Order not found')
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1
        }
      ],
      metadata: {
        orderId: orderId,
        planId: planId
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?orderId=${orderId}`,
      customer_email: order.customer.email || undefined
    })

    await prisma.order.update({
      where: { id: orderId },
      data: {
        amount: plan.price * 100,
        currency: 'usd'
      }
    })

    return { url: session.url! }
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw new Error('Failed to create checkout session')
  }
}

export async function generateCopy(orderId: string) {
  try {
    const { prisma } = await getDependencies()
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { questionnaire: true }
    })

    if (!order || !order.questionnaire) {
      throw new Error('Order or questionnaire not found')
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId,
        answers: order.questionnaire.answers
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate copy')
    }

    const result = await response.json()
    revalidatePath(`/orders/${orderId}`)
    
    return result
  } catch (error) {
    console.error('Error generating copy:', error)
    throw new Error('Failed to generate copy')
  }
}

export async function createBuyerRepo(orderId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/create-repo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderId })
    })

    if (!response.ok) {
      throw new Error('Failed to create repository')
    }

    const result = await response.json()
    revalidatePath(`/orders/${orderId}`)
    
    return result
  } catch (error) {
    console.error('Error creating repository:', error)
    throw new Error('Failed to create repository')
  }
}