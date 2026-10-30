import 'server-only'
import { z } from 'zod'
import { prisma } from './prisma'

/** Known settings with validation + defaults. Unknown keys are rejected. */
export const SETTING_SCHEMAS = {
  'roundRobin.enabled': z.boolean(),
  'notifications.emails': z.array(z.string().trim().email()).max(20),
  'booking.defaultDurationMinutes': z.number().int().min(15).max(240),
  'booking.bufferMinutes': z.number().int().min(0).max(120),
  'brand.name': z.string().trim().min(1).max(80),
  'brand.supportEmail': z.string().trim().email().max(254),
  'leads.staleDays': z.number().int().min(1).max(365),
} as const

export type SettingKey = keyof typeof SETTING_SCHEMAS

export const SETTING_DEFAULTS: { [K in SettingKey]: z.infer<(typeof SETTING_SCHEMAS)[K]> } = {
  'roundRobin.enabled': true,
  'notifications.emails': [],
  'booking.defaultDurationMinutes': 30,
  'booking.bufferMinutes': 0,
  'brand.name': 'Igani',
  'brand.supportEmail': 'hello@igani.co',
  'leads.staleDays': 7,
}

export function isSettingKey(key: string): key is SettingKey {
  return key in SETTING_SCHEMAS
}

export async function getSettings(): Promise<typeof SETTING_DEFAULTS> {
  const rows = await prisma.siteSetting.findMany()
  const out: Record<string, unknown> = { ...SETTING_DEFAULTS }
  for (const row of rows) {
    if (!isSettingKey(row.key)) continue
    const parsed = SETTING_SCHEMAS[row.key].safeParse(row.value)
    if (parsed.success) out[row.key] = parsed.data
  }
  return out as typeof SETTING_DEFAULTS
}

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof SETTING_DEFAULTS)[K]> {
  return (await getSettings())[key]
}
