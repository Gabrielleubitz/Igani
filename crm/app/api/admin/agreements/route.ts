import { NextResponse, type NextRequest } from 'next/server'
import { logActivity } from '@/lib/audit'
import { currentUserOrNull } from '@/lib/auth'
import { agreementUploadProblem, safeFileName } from '@/lib/agreements'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** ADMIN only: upload an agreement for one salesperson (multipart: userId, title, file). */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const admin = await currentUserOrNull()
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only.' }, { status: 403 })
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Could not read the upload. The file may be too big (limit 4 MB).' }, { status: 400 })
  }
  const userId = String(form.get('userId') ?? '')
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
  const problem = agreementUploadProblem({ name: file.name, type: file.type, size: file.size })
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  const person = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!person) return NextResponse.json({ error: 'Salesperson not found.' }, { status: 404 })
  const title = String(form.get('title') ?? '').trim().slice(0, 150) || file.name.replace(/\.[^.]+$/, '')
  const row = await prisma.agreement.create({
    data: { userId, title, fileName: safeFileName(file.name), mimeType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()), uploadedById: admin.id },
    select: { id: true },
  })
  await logActivity({ entityType: 'USER', entityId: userId, action: 'agreement.uploaded', actorId: admin.id, metadata: { agreementId: row.id, title, size: file.size } })
  return NextResponse.json({ id: row.id }, { status: 201 })
}
