import { NextRequest, NextResponse } from 'next/server'
import { isVercelConfigured, listDeployments, triggerRedeploy } from '@/lib/vercel'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function unauthorized(req: NextRequest): NextResponse | null {
  const key = process.env.ADMIN_SECRET_KEY
  if (!key || req.headers.get('authorization') !== `Bearer ${key}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

// GET /api/admin/vercel — recent deployments
export async function GET(req: NextRequest) {
  const denied = unauthorized(req)
  if (denied) return denied
  if (!isVercelConfigured()) {
    return NextResponse.json({ error: 'Vercel integration not configured' }, { status: 503 })
  }
  try {
    return NextResponse.json({ deployments: await listDeployments() })
  } catch (e) {
    console.error('Vercel list failed:', e)
    return NextResponse.json({ error: 'Vercel request failed' }, { status: 502 })
  }
}

// POST /api/admin/vercel — trigger a redeploy through the deploy hook
export async function POST(req: NextRequest) {
  const denied = unauthorized(req)
  if (denied) return denied
  try {
    return NextResponse.json({ ok: true, ...(await triggerRedeploy()) })
  } catch (e) {
    console.error('Vercel redeploy failed:', e)
    return NextResponse.json({ error: 'Vercel redeploy failed' }, { status: 502 })
  }
}
