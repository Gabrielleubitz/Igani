import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'offer-settings.json')

interface OfferSettings {
  endDate: string
  isActive: boolean
  lastUpdated: string
}

// Fallback functions for local development
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

async function getOfferSettingsFromFile(): Promise<OfferSettings | null> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return null
    }
    throw error
  }
}

async function saveOfferSettingsToFile(settings: OfferSettings) {
  await ensureDataDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(settings, null, 2))
}

// Main functions with KV fallback
async function getOfferSettings(): Promise<OfferSettings | null> {
  try {
    // Try Vercel KV first (for production)
    if (process.env.KV_REST_API_URL) {
      const settings = await kv.get<OfferSettings>('offer-settings')
      return settings
    }
  } catch (error) {
    console.log('KV not available, using file system fallback:', error)
  }

  // Fallback to file system (for local development)
  return await getOfferSettingsFromFile()
}

async function saveOfferSettings(settings: OfferSettings) {
  try {
    // Try Vercel KV first (for production)
    if (process.env.KV_REST_API_URL) {
      await kv.set('offer-settings', settings)
      return
    }
  } catch (error) {
    console.log('KV not available, using file system fallback:', error)
  }

  // Fallback to file system (for local development)
  await saveOfferSettingsToFile(settings)
}

export async function GET() {
  try {
    console.log('API request from', process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'server', ': /api/admin/offer-settings')
    
    const settings = await getOfferSettings()
    
    if (!settings) {
      const defaultEndDate = new Date()
      defaultEndDate.setDate(defaultEndDate.getDate() + 7)
      
      const defaultSettings: OfferSettings = {
        endDate: defaultEndDate.toISOString(),
        isActive: true,
        lastUpdated: new Date().toISOString()
      }
      
      await saveOfferSettings(defaultSettings)
      return NextResponse.json(defaultSettings)
    }
    
    return NextResponse.json(settings)
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
    const { endDate, isActive } = body

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
      endDate: endDateObj.toISOString(),
      isActive: isActive !== false,
      lastUpdated: new Date().toISOString()
    }

    await saveOfferSettings(settings)

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error saving offer settings:', error)
    return NextResponse.json(
      { error: 'Failed to save offer settings' },
      { status: 500 }
    )
  }
}