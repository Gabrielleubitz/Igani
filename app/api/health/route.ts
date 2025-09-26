import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'
import { OpenAI } from 'openai'

export async function GET() {
  const checks = {
    database: false,
    stripe: false,
    openai: false,
    github: false,
    storage: false
  }

  try {
    // Database check
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.database = true
    } catch (error) {
      console.error('Database health check failed:', error)
    }

    // Stripe check
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2023-10-16'
        })
        await stripe.balance.retrieve()
        checks.stripe = true
      }
    } catch (error) {
      console.error('Stripe health check failed:', error)
    }

    // OpenAI check
    try {
      if (process.env.OPENAI_API_KEY) {
        const openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        })
        const models = await openai.models.list()
        checks.openai = models.data.length > 0
      }
    } catch (error) {
      console.error('OpenAI health check failed:', error)
    }

    // GitHub check
    checks.github = !!(
      process.env.GITHUB_APP_ID && 
      process.env.GITHUB_APP_PRIVATE_KEY && 
      process.env.GITHUB_APP_CLIENT_ID
    )

    // Storage check
    checks.storage = !!(
      (process.env.BLOB_STORE === 'vercel' && process.env.VERCEL_BLOB_READ_WRITE_TOKEN) ||
      (process.env.BLOB_STORE === 's3' && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID)
    )

    const allHealthy = Object.values(checks).every(Boolean)

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks
    }, {
      status: allHealthy ? 200 : 503
    })

  } catch (error) {
    console.error('Health check error:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      checks,
      error: 'Health check failed'
    }, {
      status: 500
    })
  }
}