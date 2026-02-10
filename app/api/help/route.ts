import { NextRequest, NextResponse } from 'next/server'
import { saveSupportInquiry } from '@/lib/firestore'
import { put } from '@vercel/blob'

const ISSUE_TYPES = ['bug', 'something_not_working', 'feedback', 'feature_request'] as const
const PRODUCTS = ['AlmaLinks', 'Igani', 'Other'] as const

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let name = ''
    let email = ''
    let product = 'AlmaLinks'
    let issueType = 'feedback'
    let description = ''
    let stepsToReproduce: string | undefined
    let pageOrFeature: string | undefined
    let deviceType: string | undefined
    let browser: string | undefined
    let attachmentUrl: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      name = (formData.get('name') as string)?.trim() ?? ''
      email = (formData.get('email') as string)?.trim() ?? ''
      product = ((formData.get('product') as string)?.trim() || 'AlmaLinks') as string
      issueType = (formData.get('issueType') as string) || 'feedback'
      description = (formData.get('description') as string)?.trim() ?? ''
      stepsToReproduce = (formData.get('stepsToReproduce') as string)?.trim() || undefined
      pageOrFeature = (formData.get('pageOrFeature') as string)?.trim() || undefined
      deviceType = (formData.get('deviceType') as string)?.trim() || undefined
      browser = (formData.get('browser') as string)?.trim() || undefined

      const file = formData.get('attachment') as File | null
      if (file && file.size > 0 && file.size < 10 * 1024 * 1024) {
        const buffer = Buffer.from(await file.arrayBuffer())
        const blob = await put(`help/${Date.now()}-${file.name}`, buffer, {
          access: 'public',
          token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN
        })
        attachmentUrl = blob.url
      }
    } else {
      const body = await request.json()
      name = (body.name as string)?.trim() ?? ''
      email = (body.email as string)?.trim() ?? ''
      product = (body.product as string)?.trim() || 'AlmaLinks'
      issueType = body.issueType || 'feedback'
      description = (body.description as string)?.trim() ?? ''
      stepsToReproduce = (body.stepsToReproduce as string)?.trim() || undefined
      pageOrFeature = (body.pageOrFeature as string)?.trim() || undefined
      deviceType = (body.deviceType as string)?.trim() || undefined
      browser = (body.browser as string)?.trim() || undefined
      attachmentUrl = (body.attachmentUrl as string)?.trim() || undefined
    }

    if (!name || !email || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, and description are required.' },
        { status: 400 }
      )
    }

    const validIssueType = ISSUE_TYPES.includes(issueType as any)
      ? (issueType as (typeof ISSUE_TYPES)[number])
      : 'feedback'

    const userAgent = request.headers.get('user-agent') ?? undefined

    await saveSupportInquiry({
      name,
      email,
      product: product || 'AlmaLinks',
      issueType: validIssueType,
      description,
      stepsToReproduce,
      pageOrFeature,
      attachmentUrl,
      deviceType: deviceType === 'desktop' || deviceType === 'mobile' ? deviceType : undefined,
      browser,
      source: 'igani.co/help',
      userAgent
    })

    return NextResponse.json(
      { success: true, message: 'Thanks for reporting this. Our team has received it and will take a look.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Help API error:', error)
    return NextResponse.json(
      { error: 'Failed to submit. Please try again.' },
      { status: 500 }
    )
  }
}
