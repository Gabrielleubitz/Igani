import { NextResponse } from 'next/server'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface OfferSettings {
  title: string
  endDate: string
  isActive: boolean
  lastUpdated: string
}

const SETTINGS_COLLECTION = 'settings'
const OFFER_SETTINGS_DOC = 'offerSettings'

async function getOfferSettings(): Promise<OfferSettings | null> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, OFFER_SETTINGS_DOC)
    const docSnap = await getDoc(settingsRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        title: data.title || 'Black Friday Sale',
        endDate: data.endDate,
        isActive: data.isActive,
        lastUpdated: data.lastUpdated
      }
    }

    return null
  } catch (error) {
    console.error('Error getting offer settings from Firestore:', error)
    return null
  }
}

async function saveOfferSettings(settings: OfferSettings): Promise<void> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, OFFER_SETTINGS_DOC)
    await setDoc(settingsRef, settings)
  } catch (error) {
    console.error('Error saving offer settings to Firestore:', error)
    throw error
  }
}

export async function GET() {
  try {
    console.log('API request from', process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'server', ': /api/admin/offer-settings')

    const settings = await getOfferSettings()

    if (!settings) {
      const defaultEndDate = new Date()
      defaultEndDate.setDate(defaultEndDate.getDate() + 7)

      const defaultSettings: OfferSettings = {
        title: 'Black Friday Sale',
        endDate: defaultEndDate.toISOString(),
        isActive: true,
        lastUpdated: new Date().toISOString()
      }

      await saveOfferSettings(defaultSettings)
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
    console.error('Error fetching offer settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch offer settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log('API request from', process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'server', ': /api/admin/offer-settings')
    
    const body = await request.json()
    console.log('Received POST data:', body)
    const { title, endDate, isActive } = body

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!endDate) {
      return NextResponse.json(
        { error: 'End date is required' },
        { status: 400 }
      )
    }

    const endDateObj = new Date(endDate)
    if (isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const settings: OfferSettings = {
      title: title.trim(),
      endDate: endDateObj.toISOString(),
      isActive: isActive !== false,
      lastUpdated: new Date().toISOString()
    }

    await saveOfferSettings(settings)

    return NextResponse.json(settings, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
    console.error('Error saving offer settings:', error)
    return NextResponse.json(
      { error: 'Failed to save offer settings' },
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