import { NextResponse, type NextRequest } from 'next/server'
import { logActivity } from '@/lib/audit'
import { currentUserOrNull } from '@/lib/auth'
import { agreementUploadProblem, safeFileName } from '@/lib/agreements'
import { canSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Anyone who can see this lead (admins, or the salesperson it is assigned to) can attach a document to it. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  const lead = await prisma.lead.findUnique({ where: { id: params.id }, select: { id: true, assignedToId: true } })
  if (!lead || !canSeeLead(user, lead)) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Could not read the upload. The file may be too big (limit 4 MB).' }, { status: 400 })
  }
  const file = form.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 })
  const problem = agreementUploadProblem({ name: file.name, type: file.type, size: file.size })
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })
  const title = String(form.get('title') ?? '').trim().slice(0, 150) || file.name.replace(/\.[^.]+$/, '')
  const row = await prisma.leadDocument.create({
    data: { leadId: lead.id, title, fileName: safeFileName(file.name), mimeType: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()), uploadedById: user.id },
    select: { id: true },
  })
  await logActivity({ entityType: 'LEAD', entityId: lead.id, action: 'document.added', actorId: user.id, metadata: { documentId: row.id, title } })
  return NextResponse.json({ id: row.id }, { status: 201 })
}
