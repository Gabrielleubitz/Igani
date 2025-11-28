import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'leads.json')

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  source: 'landing_page' | 'main_site'
  sourceDetails?: {
    page?: string
    utm_source?: string
    utm_campaign?: string
    referrer?: string
  }
  submittedAt: string
  message?: string
  createdAt: string
}

// Fallback functions for local development
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

async function getLeadsFromFile(): Promise<Lead[]> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

async function saveLeadsToFile(leads: Lead[]) {
  await ensureDataDir()
  await fs.writeFile(DATA_FILE, JSON.stringify(leads, null, 2))
}

// Main functions with KV fallback
async function getLeads(): Promise<Lead[]> {
  try {
    // Try Vercel KV first (for production)
    if (process.env.KV_REST_API_URL) {
      const leads = await kv.get<Lead[]>('leads')
      return leads || []
    }
  } catch (error) {
    console.log('KV not available, using file system fallback:', error)
  }

  // Fallback to file system (for local development)
  return await getLeadsFromFile()
}

async function saveLeads(leads: Lead[]) {
  try {
    // Try Vercel KV first (for production)
    if (process.env.KV_REST_API_URL) {
      await kv.set('leads', leads)
      return
    }
  } catch (error) {
    console.log('KV not available, using file system fallback:', error)
  }

  // Fallback to file system (for local development)
  await saveLeadsToFile(leads)
}

export async function GET() {
  try {
    console.log('API request from', process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'server', ': /api/leads')
    
    const leads = await getLeads()
    return NextResponse.json(leads)
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    console.log('API request from', process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'server', ': /api/leads')
    
    const body = await request.json()
    const { name, email, phone, source, sourceDetails, message } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const leads = await getLeads()
    
    const submittedAt = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })

    const lead: Lead = {
      id: Date.now().toString(),
      name,
      email,
      phone,
      source: source || 'main_site',
      sourceDetails,
      submittedAt,
      message,
      createdAt: new Date().toISOString()
    }

    leads.unshift(lead)
    await saveLeads(leads)

    return NextResponse.json({ success: true, lead })
  } catch (error) {
    console.error('Error saving lead:', error)
    return NextResponse.json(
      { error: 'Failed to save lead' },
      { status: 500 }
    )
  }
}