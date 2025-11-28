import { NextResponse } from 'next/server'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'offer-settings.json')

interface OfferSettings {
  endDate: string
  isActive: boolean
  lastUpdated: string
}

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

async function getOfferSettings(): Promise<OfferSettings | null> {
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

async function saveOfferSettings(settings: OfferSettings) {
  await ensureDataDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(settings, null, 2))
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