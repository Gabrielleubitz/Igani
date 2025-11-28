import { NextResponse } from 'next/server'
import { collection, getDocs, addDoc, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

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
    form?: string
    campaign?: string
  }
  submittedAt: string
  message?: string
  createdAt: string
}

const LEADS_COLLECTION = 'leads'

async function getLeads(): Promise<Lead[]> {
  try {
    const q = query(
      collection(db, LEADS_COLLECTION),
      orderBy('createdAt', 'desc')
    )
    const querySnapshot = await getDocs(q)
    const leads: Lead[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      leads.push({
        id: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        source: data.source || 'main_site',
        sourceDetails: data.sourceDetails,
        submittedAt: data.submittedAt,
        message: data.message,
        createdAt: data.createdAt
      })
    })

    return leads
  } catch (error) {
    console.error('Error getting leads from Firestore:', error)
    return []
  }
}

async function saveLead(lead: Omit<Lead, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, LEADS_COLLECTION), {
      ...lead,
      createdAt: new Date().toISOString()
    })
    return docRef.id
  } catch (error) {
    console.error('Error saving lead to Firestore:', error)
    throw error
  }
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

    const submittedAt = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })

    const leadData: Omit<Lead, 'id'> = {
      name,
      email,
      phone,
      source: source || 'main_site',
      sourceDetails,
      submittedAt,
      message,
      createdAt: new Date().toISOString()
    }

    const leadId = await saveLead(leadData)

    return NextResponse.json({ success: true, lead: { ...leadData, id: leadId } })
  } catch (error) {
    console.error('Error saving lead:', error)
    return NextResponse.json(
      { error: 'Failed to save lead' },
      { status: 500 }
    )
  }
}