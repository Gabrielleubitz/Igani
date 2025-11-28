import { NextResponse } from 'next/server'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface SiteSettings {
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
  lastUpdated: string
}

const SETTINGS_COLLECTION = 'settings'
const SITE_SETTINGS_DOC = 'siteSettings'

async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SITE_SETTINGS_DOC)
    const docSnap = await getDoc(settingsRef)

    if (docSnap.exists()) {
      return docSnap.data() as SiteSettings
    }

    return null
  } catch (error) {
    console.error('Error getting site settings from Firestore:', error)
    return null
  }
}

async function saveSiteSettings(settings: Omit<SiteSettings, 'lastUpdated'>): Promise<void> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SITE_SETTINGS_DOC)
    await setDoc(settingsRef, {
      ...settings,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error saving site settings to Firestore:', error)
    throw error
  }
}

export async function GET() {
  try {
    console.log('API request from', process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'server', ': /api/admin/site-settings')

    const settings = await getSiteSettings()

    if (!settings) {
      // Return default settings if none exist
      const defaultSettings: Omit<SiteSettings, 'lastUpdated'> = {
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

      return NextResponse.json(defaultSettings, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      })
    }

    return NextResponse.json(settings, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
    console.error('Error fetching site settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch site settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log('API request from', process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'server', ': /api/admin/site-settings (POST)')

    const body = await request.json()
    console.log('Received POST data:', body)

    // Validate required fields (at least one field should be provided)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings data' },
        { status: 400 }
      )
    }

    // Clean up the data - remove lastUpdated if it exists in the input
    const { lastUpdated, ...settingsData } = body

    await saveSiteSettings(settingsData)

    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
    console.error('Error saving site settings:', error)
    return NextResponse.json(
      { error: 'Failed to save site settings' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
