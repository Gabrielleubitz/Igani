import { v2 as cloudinary } from 'cloudinary'
import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { cloudinaryConfigured } from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'

/**
 * Signed parameters for the browser to upload a contract PDF straight to Cloudinary.
 * The file never passes through Vercel, so contracts aren't limited by the 4.5 MB request cap.
 */
export async function POST(_req: Request, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!cloudinaryConfigured()) return NextResponse.json({ error: 'Cloudinary is not set up for the CRM yet (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).' }, { status: 503 })
  const offer = await prisma.offer.findUnique({ where: { id: params.id }, select: { slug: true, status: true } })
  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  if (offer.status === 'SIGNED') return NextResponse.json({ error: 'This offer is signed.' }, { status: 409 })

  const timestamp = Math.floor(Date.now() / 1000)
  const folder = 'igani/offers'
  const publicId = `${offer.slug}-contract-${timestamp}.pdf`
  const toSign = { folder, public_id: publicId, timestamp }
  const signature = cloudinary.utils.api_sign_request(toSign, process.env.CLOUDINARY_API_SECRET!)
  return NextResponse.json({
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload`,
    fields: { ...toSign, api_key: process.env.CLOUDINARY_API_KEY, signature },
  })
}
