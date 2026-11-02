/** Defaults when Firestore / admin leave a field empty */
/** Igani's official Instagram — fixed here rather than read from admin settings */
export const INSTAGRAM_URL = 'https://www.instagram.com/igani.co/'
export const DEFAULT_TIKTOK_URL = 'https://www.tiktok.com/@igani.co'
export const DEFAULT_WHATSAPP_FALLBACK = '+972584477757'

/** Footer phone numbers, each labelled with whose it is. Gabriel's is the one the site already showed. */
export const GABRIEL_PHONE = '+972 58-447-7757'
export const AMITAY_PHONE = '+972 54-540-8814'

export function teamPhones(settings: { businessPhone?: string }): { label: string; display: string; tel: string }[] {
  const gabriel = settings.businessPhone?.trim() || GABRIEL_PHONE
  return [
    { label: 'Gabriel', display: gabriel, tel: gabriel.replace(/[^\d+]/g, '') },
    { label: 'Amitay', display: AMITAY_PHONE, tel: AMITAY_PHONE.replace(/[^\d+]/g, '') },
  ]
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
