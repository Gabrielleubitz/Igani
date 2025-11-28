import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface SiteSettings {
  businessEmail: string
  businessPhone: string
  businessAddress: string
  whatsappNumber: string
  linkedinUrl: string
  instagramUrl: string
  facebookUrl: string
  twitterUrl: string
  githubUrl: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  adminNotificationEmail: string
  enableLeadNotifications: boolean
  enableInquiryNotifications: boolean
  footerTagline: string
  copyrightText: string
  lastUpdated?: string
}

const defaultSettings: SiteSettings = {
  businessEmail: '',
  businessPhone: '',
  businessAddress: '',
  whatsappNumber: '',
  linkedinUrl: '',
  instagramUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  githubUrl: '',
  metaTitle: 'IGANI - Web Development & Design',
  metaDescription: 'Professional web development and design services',
  metaKeywords: 'web development, design, websites, digital solutions',
  adminNotificationEmail: '',
  enableLeadNotifications: true,
  enableInquiryNotifications: true,
  footerTagline: 'Building digital experiences that matter',
  copyrightText: '© 2024 IGANI. All rights reserved.'
}

const SETTINGS_COLLECTION = 'settings'
const SITE_SETTINGS_DOC = 'siteSettings'

let cachedSettings: SiteSettings | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getSiteSettings(): Promise<SiteSettings> {
  // Return cached settings if still valid
  const now = Date.now()
  if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSettings
  }

  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SITE_SETTINGS_DOC)
    const docSnap = await getDoc(settingsRef)

    if (docSnap.exists()) {
      const settings = { ...defaultSettings, ...docSnap.data() } as SiteSettings
      cachedSettings = settings
      cacheTimestamp = now
      return settings
    }

    return defaultSettings
  } catch (error) {
    console.error('Error fetching site settings:', error)
    return defaultSettings
  }
}

// Function to clear cache (useful for testing or after updates)
export function clearSettingsCache() {
  cachedSettings = null
  cacheTimestamp = 0
}
