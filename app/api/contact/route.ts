import { NextRequest, NextResponse } from 'next/server'
import { saveContactSubmission } from '@/lib/firestore'
import { sendAdminNotification } from '@/lib/mailjet'
import { buildContactNotificationEmail } from '@/lib/email-templates'
import { crmLeadFromContactSubmission, forwardLeadToCrm } from '@/lib/crm'

const utmFrom = (body: Record<string, unknown>) => {
  const u = (body.utm ?? {}) as Record<string, unknown>
  const pick = (k: string) => (typeof u[k] === 'string' ? (u[k] as string) : typeof body[`utm_${k}`] === 'string' ? (body[`utm_${k}`] as string) : undefined)
  return { source: pick('source'), medium: pick('medium'), campaign: pick('campaign'), term: pick('term'), content: pick('content') }
}

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

    // Forward to the Igani CRM (best effort: never blocks the visitor's form)
    await forwardLeadToCrm({
      ...crmLeadFromContactSubmission(submissionData),
      utm: utmFrom(body),
      sourceDetail: [typeof body.page === 'string' ? body.page : '/contact', submissionData.projectType].filter(Boolean).join(' · '),
    })

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
