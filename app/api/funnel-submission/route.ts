import { NextRequest, NextResponse } from 'next/server'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, businessType, message } = body

    // Validate required fields
    if (!name || !email || !businessType || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Save to Firestore
    const submissionData = {
      name,
      email,
      phone: phone || '',
      businessType,
      message,
      source: 'funnels-page',
      submittedAt: serverTimestamp(),
      status: 'new'
    }

    await addDoc(collection(db, 'funnel-submissions'), submissionData)

    // TODO: Send email notification (optional)
    // You can integrate with Mailjet, SendGrid, or another email service here

    return NextResponse.json(
      { success: true, message: 'Form submitted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error saving funnel submission:', error)
    return NextResponse.json(
      { error: 'Failed to submit form' },
      { status: 500 }
    )
  }
}
