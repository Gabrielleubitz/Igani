import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { liveHint, transcribeWindow } from '@/lib/live-hints'
import { MAX_CONTEXT_CHARS, MAX_WINDOW_BYTES, trimContext } from '@/lib/live-hints-core'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const runtime = 'nodejs'
export const maxDuration = 30

const LIVE = ['INITIATED', 'RINGING', 'IN_PROGRESS']
const lastAt = new Map<string, number>()

/**
 * Live Straight Line hints. The browser sends the last few seconds of each side's audio (rep and client are separate streams, so
 * nobody is mislabeled); we transcribe them, append to the running conversation the browser keeps, and return the new lines plus at
 * most one short hint. Nothing is stored. Only the caller, only while the call is live, only when hints are switched on.
 */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'SALES')) return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: 'Hints are not available' }, { status: 503 })
  const { id } = await props.params
  const [call, enabled] = await Promise.all([prisma.call.findUnique({ where: { id }, select: { userId: true, status: true, direction: true } }), getSetting('voice.hints')])
  if (!enabled) return NextResponse.json({ error: 'Hints are switched off' }, { status: 403 })
  if (!call || call.userId !== user.id || !LIVE.includes(call.status)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const now = Date.now()
  if (now - (lastAt.get(id) ?? 0) < 3500) return NextResponse.json({ error: 'Too fast' }, { status: 429 })
  lastAt.set(id, now)
  if (lastAt.size > 2000) lastAt.clear()

  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const rep = form.get('rep')
  const client = form.get('client')
  const files = [rep, client].filter((f): f is File => f instanceof File && f.size > 1500 && f.size <= MAX_WINDOW_BYTES)
  const context = String(form.get('context') ?? '').slice(-MAX_CONTEXT_CHARS)
  const recent = (() => {
    try {
      const r = JSON.parse(String(form.get('recent') ?? '[]')) as unknown
      return Array.isArray(r) ? r.filter((x): x is string => typeof x === 'string').slice(-4) : []
    } catch {
      return []
    }
  })()
  const elapsed = Number(form.get('elapsed')) || 0

  try {
    const [repText, clientText] = await Promise.all([rep instanceof File && files.includes(rep) ? transcribeWindow(rep, 'rep.webm', key) : '', client instanceof File && files.includes(client) ? transcribeWindow(client, 'client.webm', key) : ''])
    const lines = [...(clientText ? [{ speaker: 'client' as const, text: clientText }] : []), ...(repText ? [{ speaker: 'rep' as const, text: repText }] : [])]
    if (!lines.length) return NextResponse.json({ lines: [], hint: null })
    const next = trimContext(`${context}${context ? '\n' : ''}${lines.map((l) => `${l.speaker === 'rep' ? 'REP' : 'CLIENT'}: ${l.text}`).join('\n')}`)
    const hint = await liveHint(next, recent, elapsed, key)
    return NextResponse.json({ lines, hint })
  } catch (e) {
    console.error('[live-hints]', e)
    return NextResponse.json({ error: 'Hint failed' }, { status: 502 })
  }
}
