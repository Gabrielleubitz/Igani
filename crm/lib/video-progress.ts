import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { PROGRESS_PREFIX, courseOrder, emptyProgress, parseProgress, progressKey, unlockedIds, type Progress } from './video-core'
import { listVideos } from './video'

const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue

export async function getProgress(userId: string): Promise<Progress> {
  const row = await prisma.siteSetting.findUnique({ where: { key: progressKey(userId) } })
  return row ? parseProgress(row.value) : emptyProgress()
}

async function saveProgress(userId: string, p: Progress): Promise<void> {
  await prisma.siteSetting.upsert({ where: { key: progressKey(userId) }, create: { key: progressKey(userId), value: json(p) }, update: { value: json(p) } })
}

/** Which team videos a salesperson may play right now. */
export async function unlockedFor(userId: string): Promise<{ ordered: Awaited<ReturnType<typeof listVideos>>; progress: Progress; unlocked: string[] }> {
  const [videos, progress] = await Promise.all([listVideos(), getProgress(userId)])
  const ordered = courseOrder(videos)
  return { ordered, progress, unlocked: unlockedIds(ordered.map((v) => v.id), progress.completed) }
}

/** Remembers when a lesson was first played (once), so it cannot be finished faster than its length. */
export async function markStarted(userId: string, videoId: string, progress: Progress, now = Date.now()): Promise<void> {
  if (progress.started[videoId] || progress.completed.includes(videoId)) return
  await saveProgress(userId, { ...progress, started: { ...progress.started, [videoId]: now } })
}

export async function markCompleted(userId: string, videoId: string, progress: Progress): Promise<void> {
  if (progress.completed.includes(videoId)) return
  await saveProgress(userId, { ...progress, completed: [...progress.completed, videoId] })
}

export async function setProgress(userId: string, completed: string[]): Promise<void> {
  await saveProgress(userId, { completed, started: {} })
}

export async function allProgress(): Promise<Map<string, Progress>> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: PROGRESS_PREFIX } } })
  return new Map(rows.map((r) => [r.key.slice(PROGRESS_PREFIX.length), parseProgress(r.value)]))
}
