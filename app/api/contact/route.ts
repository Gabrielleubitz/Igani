import { NextRequest, NextResponse } from 'next/server'
import { saveContactSubmission } from '@/lib/firestore'
import { sendAdminNotification } from '@/lib/mailjet'
import { buildContactNotificationEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, phone, projectType, message } = body

    if (!email || !message) {
      return NextResponse.json(
        { error: 'Email and message are required.' },
        { status: 400 }
      )
    }

    const submissionData = {
      firstName: (firstName as string)?.trim() ?? '',
      lastName: (lastName as string)?.trim() ?? '',
      email: (email as string)?.trim(),
      phone: (phone as string)?.trim() || '',
      projectType: (projectType as string)?.trim() || 'Other',
      message: (message as string)?.trim()
    }

    await saveContactSubmission(submissionData)

    // Forward to the Igani CRM (best effort: never block the visitor's form)
    const crmUrl = process.env.CRM_LEAD_WEBHOOK_URL
    const crmKey = process.env.CRM_LEAD_WEBHOOK_SECRET
    if (crmUrl && crmKey) {
      try {
        const res = await fetch(crmUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': crmKey },
          body: JSON.stringify({
            email: submissionData.email,
            firstName: submissionData.firstName,
            lastName: submissionData.lastName,
            phone: submissionData.phone,
            message: `${submissionData.projectType}: ${submissionData.message}`,
            source: 'igani.co contact form',
          }),
          signal: AbortSignal.timeout(8000),
        })
        if (!res.ok) console.error('CRM lead webhook failed:', res.status)
      } catch (err) {
        console.error('CRM lead webhook error:', err)
      }
    }

    const html = buildContactNotificationEmail(submissionData)
    await sendAdminNotification(
      `[IGANI] New contact: ${submissionData.firstName} ${submissionData.lastName}`,
      html,
      `New contact from ${submissionData.email}: ${submissionData.message}`
    )

    return NextResponse.json(
      { success: true, message: 'Thank you. We will get back to you soon.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Failed to send. Please try again.' },
      { status: 500 }
    )
  }
}
