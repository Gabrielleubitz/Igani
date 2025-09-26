import { NextRequest, NextResponse } from 'next/server'
import type { QuestionnaireData } from '@/lib/types'

// Ensure this route is not statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Dynamic imports to prevent build-time issues
async function getDependencies() {
  const { OpenAI } = await import('openai')
  const { prisma } = await import('@/lib/prisma')
  const { GeneratedCopySchema } = await import('@/lib/types')
  return { OpenAI, prisma, GeneratedCopySchema }
}

export async function POST(request: NextRequest) {
  try {
    const { orderId, answers } = await request.json()

    if (!orderId || !answers) {
      return NextResponse.json(
        { error: 'Missing orderId or answers' },
        { status: 400 }
      )
    }

    // Get dependencies dynamically
    const { OpenAI, prisma, GeneratedCopySchema } = await getDependencies()

    const questionnaireData = answers as QuestionnaireData

    const systemPrompt = `You are a professional copywriter specializing in tech meetups and events. You create engaging, concise copy that resonates with builders, founders, and investors.

Guidelines:
- Write in a ${questionnaireData.brand.tone} tone
- Keep email subjects under 55 characters
- Keep SMS messages under 140 characters  
- No emojis unless tone is "energetic"
- Focus on community, networking, and learning
- Use the brand name: ${questionnaireData.brand.name}
- Location: ${questionnaireData.location}
- Sample event: ${questionnaireData.event.sampleName}

Return ONLY valid JSON matching this exact structure - no other text or formatting.`

    const userPrompt = `Generate copy for an event site with these details:

Brand: ${questionnaireData.brand.name} - ${questionnaireData.brand.tagline}
Tone: ${questionnaireData.brand.tone}
Location: ${questionnaireData.location}
Audience: ${questionnaireData.audience.founders}% founders, ${questionnaireData.audience.builders}% builders, ${questionnaireData.audience.investors}% investors
Event Cadence: ${questionnaireData.event.cadence}
Sample Event: ${questionnaireData.event.sampleName}
Primary Color: ${questionnaireData.colors.primary}

Create compelling copy that speaks to this specific audience and reflects the brand tone.`

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('No response from OpenAI')
    }

    let generatedContent
    try {
      generatedContent = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText)
      throw new Error('Invalid JSON response from OpenAI')
    }

    // Validate the generated content matches our schema
    const validatedCopy = GeneratedCopySchema.parse(generatedContent)

    // Save to database
    const savedCopy = await prisma.generatedCopy.upsert({
      where: { orderId },
      create: {
        orderId,
        site: validatedCopy.site,
        emails: validatedCopy.emails,
        sms: validatedCopy.sms,
        theme: {
          ...validatedCopy.theme,
          colors: {
            ...validatedCopy.theme.colors,
            primary: questionnaireData.colors.primary
          },
          brandName: questionnaireData.brand.name
        }
      },
      update: {
        site: validatedCopy.site,
        emails: validatedCopy.emails,
        sms: validatedCopy.sms,
        theme: {
          ...validatedCopy.theme,
          colors: {
            ...validatedCopy.theme.colors,
            primary: questionnaireData.colors.primary
          },
          brandName: questionnaireData.brand.name
        }
      }
    })

    return NextResponse.json({
      success: true,
      generatedCopy: savedCopy
    })

  } catch (error) {
    console.error('Copy generation error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate copy' },
      { status: 500 }
    )
  }
}