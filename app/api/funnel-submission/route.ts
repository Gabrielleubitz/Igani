import { NextRequest, NextResponse } from 'next/server'
import { saveContactSubmission } from '@/lib/firestore'
import { sendAdminNotification } from '@/lib/mailjet'
import { buildFunnelNotificationEmail } from '@/lib/email-templates'

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

    // Split name into first and last name (simple approach)
    const nameParts = name.trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    // Transform funnel data to match contact submission format
    const submissionData = {
      firstName,
      lastName,
      email,
      projectType: businessType, // Map businessType to projectType
      message: `[Funnel Lead - ${businessType}]\n${phone ? `Phone: ${phone}\n` : ''}${message}`
    }

    await saveContactSubmission(submissionData)

    const html = buildFunnelNotificationEmail(submissionData)
    await sendAdminNotification(
      `[IGANI] New funnel lead: ${firstName} ${lastName}`,
      html,
      `Funnel lead from ${email}: ${message}`
    )

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
