import { NextResponse } from 'next/server'
import { sendAdminNotification } from '@/lib/mailjet'

const ADMIN_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'gabrielleubitz@gmail.com'

export async function POST() {
  try {
    const html = `
      <h2 style="margin:0 0 12px; color: #e2e8f0; font-size: 18px;">Mailjet test</h2>
      <p style="margin:0; color: #94a3b8; font-size: 14px;">
        This is a test email from your IGANI admin panel. If you received this, Mailjet is configured correctly.
      </p>
      <p style="margin:16px 0 0; color: #64748b; font-size: 12px;">
        Sent at ${new Date().toISOString()}
      </p>
    `
    const ok = await sendAdminNotification(
      '[IGANI] Mailjet test',
      html,
      'This is a test email from your IGANI admin panel. Mailjet is working.'
    )
    if (!ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mailjet not configured or send failed. Set MAILJET_API_KEY and MAILJET_SECRET_KEY.',
          configured: false
        },
        { status: 503 }
      )
    }
    return NextResponse.json({
      success: true,
      message: `Test email sent to ${ADMIN_EMAIL}`,
      configured: true
    })
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Send failed',
        configured: true
      },
      { status: 500 }
    )
  }
}
