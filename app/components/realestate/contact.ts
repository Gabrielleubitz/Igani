// Contact details for the real estate funnel. The company WhatsApp/phone is the same number as on /start.
const WHATSAPP_NUMBER = '972584477757'

export const PHONE_DISPLAY = '+972 58-447-7757'
export const PHONE_TEL = '+972584477757'
export const ADDRESS = 'Yosef Lapid 1, Netanya'

const chat = (number: string, text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`

// WhatsApp chat for the real estate funnel, with the opening message already typed in
export const WHATSAPP_HREF = chat(WHATSAPP_NUMBER, 'Hi IGANI, I’m a real estate agent and I’d like to talk about a new website.')

/**
 * Each founder's own WhatsApp number (digits with country code, no "+"), by first name in lower case.
 * Fill these in when you have them, e.g. ilan: '9725XXXXXXXX'. Until a number is added, that founder's
 * photo opens the company chat.
 */
const FOUNDER_NUMBERS: Record<string, string> = {
  // ilan: '',
  // amitay: '',
  // gabriel: '',
}

export function founderWhatsAppHref(fullName: string) {
  const first = fullName.trim().split(' ')[0]
  const number = FOUNDER_NUMBERS[first.toLowerCase()] || WHATSAPP_NUMBER
  return chat(number, `Hi ${first}, I’m a real estate agent and I’d like to talk about a new website.`)
}
