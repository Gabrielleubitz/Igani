import { NextRequest, NextResponse } from 'next/server'
import { uploadToCloudinary, cloudinaryConfigured } from '@/lib/cloudinary'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    if (!cloudinaryConfigured) {
      return NextResponse.json(
        { error: 'Image upload is not configured. Set CLOUDINARY_* env vars.' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Max 10 MB.' },
        { status: 400 }
      )
    }

    const type = file.type?.toLowerCase()
    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, GIF, or WebP.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadToCloudinary(buffer, {
      folder: 'igani/admin',
      resourceType: 'image'
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Upload failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: result.secure_url })
  } catch (error) {
    console.error('Admin upload error:', error)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    )
  }
}
