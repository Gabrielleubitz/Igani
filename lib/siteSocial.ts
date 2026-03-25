/** Defaults when Firestore / admin leave a field empty */
export const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/igani.co/'
export const DEFAULT_TIKTOK_URL = 'https://www.tiktok.com/@igani.co'
export const DEFAULT_WHATSAPP_FALLBACK = '+972584477757'

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
