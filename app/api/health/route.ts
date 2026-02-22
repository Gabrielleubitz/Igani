import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const checks: Record<string, boolean> = {
    database: false,
    stripe: false,
    openai: false,
    github: false,
    storage: false
  }

  // Database (Prisma) - optional
  try {
    if (process.env.DATABASE_URL) {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      checks.database = true
    }
  } catch (error) {
    console.error('Database health check failed:', error)
  }

  // Stripe - optional
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
      await stripe.balance.retrieve()
      checks.stripe = true
    }
  } catch (error) {
    console.error('Stripe health check failed:', error)
  }

  // OpenAI - optional
  try {
    if (process.env.OPENAI_API_KEY) {
      const { OpenAI } = await import('openai')
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      const models = await openai.models.list()
      checks.openai = (models.data?.length ?? 0) > 0
    }
  } catch (error) {
    console.error('OpenAI health check failed:', error)
  }

  // GitHub - env only
  checks.github = !!(
    process.env.GITHUB_APP_ID &&
    process.env.GITHUB_APP_PRIVATE_KEY &&
    process.env.GITHUB_APP_CLIENT_ID
  )

  // Storage - env only
  checks.storage = !!(
    (process.env.BLOB_STORE === 'vercel' && process.env.VERCEL_BLOB_READ_WRITE_TOKEN) ||
    (process.env.BLOB_STORE === 's3' && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID)
  )

  // Always return 200 so the endpoint is usable for "is the app up?" checks.
  const allHealthy = Object.values(checks).every(Boolean)
  const status = allHealthy ? 'healthy' : 'degraded'

  return NextResponse.json({
    status,
    timestamp: new Date().toISOString(),
    checks
  })
}
