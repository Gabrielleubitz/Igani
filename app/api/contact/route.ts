import { NextRequest, NextResponse } from 'next/server'
import { saveContactSubmission } from '@/lib/firestore'
import { sendAdminNotification } from '@/lib/mailjet'
import { buildContactNotificationEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { firstName, lastName, email, projectType, message } = body

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
      projectType: (projectType as string)?.trim() || 'Other',
      message: (message as string)?.trim()
    }

    await saveContactSubmission(submissionData)

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
