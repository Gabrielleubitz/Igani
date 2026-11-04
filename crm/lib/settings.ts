import 'server-only'
import { z } from 'zod'
import { prisma } from './prisma'

/** Known settings with validation + defaults. Unknown keys are rejected. */
export const SETTING_SCHEMAS = {
  'roundRobin.enabled': z.boolean(),
  /** Every new website lead goes to this teammate (login email). Empty, or not an active teammate = round-robin. */
  'leads.defaultOwnerEmail': z.union([z.literal(''), z.string().trim().toLowerCase().email().max(254)]),
  'notifications.emails': z.array(z.string().trim().email()).max(20),
  'booking.defaultDurationMinutes': z.number().int().min(15).max(240),
  'booking.bufferMinutes': z.number().int().min(0).max(120),
  'brand.name': z.string().trim().min(1).max(80),
  'brand.supportEmail': z.string().trim().email().max(254),
  'leads.staleDays': z.number().int().min(1).max(365),
  /** Email the notification list whenever a new inbound lead arrives */
  'notifications.newLead': z.boolean(),
  /** Email guests a reminder ~24 hours before a confirmed meeting */
  'reminders.meetingEmails': z.boolean(),
  /** Email every admin a summary of the week on Sunday morning */
  'notifications.weeklySummary': z.boolean(),
  /** Visitor analytics (scroll, clicks, heatmap) on the main website's pages, switched per page under Admin → Website */
  'website.tracking': z.object({ home: z.boolean(), realestate: z.boolean() }),
  /** Dialer: record calls (both sides) and which countries may be called */
  'voice.record': z.boolean(),
  'voice.countries': z.array(z.enum(['IL', 'US'])).min(1),
  /** Who signs contracts for Igani (shown in the signature box) */
  'contract.signer': z.object({ name: z.string().trim().max(120), title: z.string().trim().max(120), email: z.union([z.literal(''), z.string().trim().email().max(254)]), phone: z.string().trim().max(40) }),
  /** Igani's drawn signature (PNG data URL), put on every contract when an admin approves it */
  'contract.signature': z.union([z.literal(''), z.string().max(400_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/)]),
} as const

export type SettingKey = keyof typeof SETTING_SCHEMAS

export const SETTING_DEFAULTS: { [K in SettingKey]: z.infer<(typeof SETTING_SCHEMAS)[K]> } = {
  'roundRobin.enabled': true,
  'leads.defaultOwnerEmail': '',
  'notifications.emails': [],
  'booking.defaultDurationMinutes': 30,
  'booking.bufferMinutes': 0,
  'brand.name': 'Igani',
  'brand.supportEmail': 'hello@igani.co',
  'leads.staleDays': 7,
  'notifications.newLead': true,
  'reminders.meetingEmails': true,
  'notifications.weeklySummary': true,
  'website.tracking': { home: true, realestate: true },
  'voice.record': true,
  'voice.countries': ['IL', 'US'],
  'contract.signer': { name: '', title: '', email: '', phone: '' },
  'contract.signature': '',
}

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTING_SCHEMAS, key)
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
