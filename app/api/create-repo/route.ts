import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GitHubService } from '@/lib/github'

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      )
    }

    // Get order with all related data
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        questionnaire: true,
        generatedCopy: true,
        delivery: true
      }
    })

    if (!order || !order.generatedCopy) {
      return NextResponse.json(
        { error: 'Order or generated copy not found' },
        { status: 404 }
      )
    }

    // Check if repo already exists
    if (order.delivery?.repoUrl) {
      return NextResponse.json({
        success: true,
        repoUrl: order.delivery.repoUrl,
        message: 'Repository already exists'
      })
    }

    const brandName = (order.generatedCopy.site as any)?.brandName || 'event-site'
    const repoName = `events-${brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`

    // Try to create GitHub repository from template
    const githubService = new GitHubService()
    
    try {
      // Create repository from the Igani-w-g template
      const repoResult = await githubService.createRepository(
        'placeholder-installation-id', // Would come from GitHub App installation
        'buyer-username', // Would come from authenticated user
        repoName,
        order.generatedCopy
      )
      
      const delivery = await prisma.delivery.create({
        data: {
          orderId: orderId,
          method: 'GITHUB',
          repoUrl: repoResult.repoUrl,
          commitSha: repoResult.commitSha
        }
      })

      return NextResponse.json({
        success: true,
        delivery: delivery,
        repoUrl: repoResult.repoUrl,
        message: 'Repository created successfully'
      })
      
    } catch (githubError) {
      console.error('GitHub repository creation failed, falling back to ZIP:', githubError)
      
      // Create ZIP delivery as fallback
      const zipDelivery = await prisma.delivery.create({
        data: {
          orderId: orderId,
          method: 'ZIP',
          zipUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/download/${orderId}`,
          commitSha: null
        }
      })

      return NextResponse.json({
        success: true,
        delivery: zipDelivery,
        message: 'Created ZIP package as fallback (GitHub setup required for repo creation)'
      })
    }

  } catch (error) {
    console.error('Repository creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create repository' },
      { status: 500 }
    )
  }
}