/** Defaults when Firestore / admin leave a field empty */
/** Igani's official Instagram — fixed here rather than read from admin settings */
export const INSTAGRAM_URL = 'https://www.instagram.com/igani.co/'
export const DEFAULT_TIKTOK_URL = 'https://www.tiktok.com/@igani.co'
export const DEFAULT_WHATSAPP_FALLBACK = '+972584477757'

/** Footer phone numbers, each labelled with whose it is. Gabriel's is the one the site already showed. */
export const GABRIEL_PHONE = '+972 58-447-7757'
export const AMITAY_PHONE = '+972 54-540-8814'

/** The office lines the new site shows (same defaults as public/site and the shell header). */
export const OFFICE_PHONES = [
  { label: 'Israel office', display: '09-376-1325', tel: '+97293761325' },
  { label: 'US office', display: '+1 (570) 634-8730', tel: '+15706348730' },
] as const

/** One display format for every Israeli number, whatever way it was typed: "+972 58-447-7757". Anything else is shown as typed. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const m = /^(?:972|0)?(5\d)(\d{3})(\d{4})$/.exec(digits)
  return m ? `+972 ${m[1]}-${m[2]}-${m[3]}` : raw.trim()
}

export function teamPhones(settings: { businessPhone?: string }): { label: string; display: string; tel: string }[] {
  const people = [
    { label: 'Gabriel', raw: settings.businessPhone?.trim() || GABRIEL_PHONE },
    { label: 'Amitay', raw: AMITAY_PHONE },
  ]
  // Same format for each, so the list reads evenly whichever way the number was saved in the admin settings.
  return people.map((p) => ({ label: p.label, display: formatPhone(p.raw), tel: `+${formatPhone(p.raw).replace(/\D/g, '')}` }))
}

export function whatsappDigitsFromSettings(settings: {
  whatsappNumber: string
  businessPhone: string
}): string {
  const raw =
    settings.whatsappNumber?.trim() ||
    settings.businessPhone?.trim() ||
    DEFAULT_WHATSAPP_FALLBACK
  return raw.replace(/[^0-9]/g, '')
}

export function getWhatsAppChatHref(
  settings: { whatsappNumber: string; businessPhone: string },
  prefillMessage: string
): string {
  return `https://wa.me/${whatsappDigitsFromSettings(settings)}?text=${encodeURIComponent(prefillMessage)}`
}

export function tiktokHrefFromSettings(tiktokUrl: string | undefined): string {
  return tiktokUrl?.trim() || DEFAULT_TIKTOK_URL
}
