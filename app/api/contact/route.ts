import { NextRequest, NextResponse } from 'next/server'
import { saveContactSubmission } from '@/lib/firestore'
import { sendAdminNotification } from '@/lib/mailjet'
import { buildContactNotificationEmail } from '@/lib/email-templates'
import { crmLeadFromContactSubmission, forwardLeadToCrm } from '@/lib/crm'
import { checkSubmission } from '@/lib/spam-check'

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

    // Fake sign-ups: answered like a real one (bots learn nothing), but never stored, emailed or sent to the CRM
    const verdict = checkSubmission({ firstName, lastName, email, message, honeypot: typeof body.website_url === 'string' ? body.website_url : null, elapsedMs: typeof body._elapsed === 'number' ? body._elapsed : null })
    if (verdict.spam) {
      console.warn('[contact] blocked fake sign-up', { email: String(email).slice(0, 80), reasons: verdict.reasons })
      return NextResponse.json({ success: true, message: 'Thank you. We will get back to you soon.' }, { status: 200 })
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

    // Forward to the Igani CRM in parallel with the admin email; neither can fail the visitor's form.
    const crm = forwardLeadToCrm({
      ...crmLeadFromContactSubmission({ ...submissionData, page: typeof body.page === 'string' ? body.page.slice(0, 100) : undefined }),
      utm: utmFrom(body),
    })

    const html = buildContactNotificationEmail(submissionData)
    const mail = sendAdminNotification(
      `[IGANI] New contact: ${submissionData.firstName} ${submissionData.lastName}`,
      html,
      `New contact from ${submissionData.email}: ${submissionData.message}`
    )

    await Promise.allSettled([crm, mail])

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
