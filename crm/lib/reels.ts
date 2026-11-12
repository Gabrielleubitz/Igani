import 'server-only'
import { randomBytes } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Reels made by the twice-a-day job, waiting for a person: the job uploads the file to the private bucket and adds it
 * here; an admin watches it on /admin/reels and presses Approve to publish to Instagram (or dismisses it).
 */
export type ReelStatus = 'uploading' | 'pending' | 'processing' | 'posted' | 'failed' | 'dismissed'
export type Reel = {
  id: string
  title: string
  caption: string
  key: string
  status: ReelStatus
  createdAt: number
  containerId?: string
  permalink?: string | null
  error?: string | null
  decidedBy?: string
  decidedAt?: number
}
const KEY = 'reels.queue'

export async function listReels(): Promise<Reel[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
  return ((row?.value as unknown as Reel[]) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt)
}
async function write(list: Reel[]): Promise<void> {
  const v = list.slice(0, 60) as unknown as Prisma.InputJsonValue
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: v }, update: { value: v } })
}
export async function getReel(id: string): Promise<Reel | null> {
  return (await listReels()).find((r) => r.id === id) ?? null
}
export async function addReel(title: string, caption: string): Promise<Reel> {
  const id = randomBytes(8).toString('hex')
  const reel: Reel = { id, title: title.slice(0, 120), caption: caption.slice(0, 2200), key: `reels/${id}.mp4`, status: 'uploading', createdAt: Date.now() }
  await write([reel, ...(await listReels())])
  return reel
}
export async function updateReel(id: string, patch: Partial<Reel>): Promise<Reel | null> {
  const list = await listReels()
  const i = list.findIndex((r) => r.id === id)
  if (i < 0) return null
  list[i] = { ...list[i]!, ...patch }
  await write(list)
  return list[i]!
}
