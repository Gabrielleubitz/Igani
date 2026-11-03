import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { downloadContract } from '@/lib/cloudinary'
import { approvedContract, initials, renderContract } from '@/lib/contract-data'
import { htmlToPdf } from '@/lib/pdf-render'
import { getSetting } from '@/lib/settings'
import { sendOfferSignedEmail } from '@/lib/email'
import { appUrl, env } from '@/lib/env'
import { formatModulePrice, formatPrice, normalizeSelection, parseModules, recurringTotals, selectionTotal } from '@/lib/offer-modules'
import { SIGNABLE_LEAD_STAGES, publicOfferUrl } from '@/lib/offers'
import { buildSignedPdf } from '@/lib/offer-sign'
import { prisma } from '@/lib/prisma'
import { createAutoTask } from '@/lib/tasks'

export const runtime = 'nodejs'
export const maxDuration = 60

const PNG_PREFIX = 'data:image/png;base64,'
/** The drawn signature: a PNG data URL and nothing else (it is embedded into the contract HTML and PDF). */
const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/
const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  signature: z.string().max(600_000).regex(PNG_DATA_URL),
  agree: z.literal(true),
  modules: z.array(z.string().max(80)).max(60),
  lang: z.enum(['he', 'en']).default('he'),
  title: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
})

function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}


/**
 * The client signs a live offer: the contract gets a signature page, the signed PDF is saved on the lead,
 * the lead moves to Signed with a "send the down-payment invoice" task, and both sides get the PDF by email.
 */
export async function POST(req: Request, { params }: { params: { slug: string } }): Promise<NextResponse> {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0]
    const msg = field === 'agree' ? 'Please accept the agreement.' : field === 'signature' ? 'Please draw your signature.' : field === 'email' ? 'Please enter a valid email.' : field === 'name' ? 'Please enter your full name.' : 'Invalid request'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  const body = parsed.data

  const offer = await prisma.offer.findUnique({
    where: { slug: params.slug },
    include: { lead: { select: { id: true, status: true, firstName: true, lastName: true, email: true, phone: true, company: true, assignedToId: true } } },
  })
  if (!offer || offer.status === 'DRAFT' || offer.status === 'ARCHIVED') return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  if (offer.status === 'SIGNED') return NextResponse.json({ error: 'This offer was already signed.' }, { status: 409 })
  const built = approvedContract(offer)
  if (!built && !offer.contractPublicId) return NextResponse.json({ error: 'The agreement is not attached yet. Please contact us.' }, { status: 409 })

  const modules = parseModules(offer.modules)
  const selected = normalizeSelection(modules, body.modules)
  const total = selectionTotal(modules, selected)
  const recurring = recurringTotals(modules, selected, offer.monthlyPrice)
  const monthlyText = recurring.month ? formatPrice(recurring.month, offer.currency) : null
  const yearlyText = recurring.year ? formatPrice(recurring.year, offer.currency) : null
  const signedAt = new Date()
  const ip = clientIp(req)
  const clientName = offer.lead.company || [offer.lead.firstName, offer.lead.lastName].filter(Boolean).join(' ') || body.name
  const offerUrl = publicOfferUrl(offer.slug)

  let pdf: Uint8Array
  try {
    if (built) {
      // Contract built in the CRM: the client's details go straight into the signature boxes, Igani is already signed
      const signing = { name: body.name, title: body.title || null, email: body.email, phone: body.phone || null, signaturePng: body.signature, signedAt, ip }
      const html = await renderContract(offer, built, { status: 'signed', selected, signing })
      const signer = await getSetting('contract.signer')
      pdf = await htmlToPdf(html, { footer: `${body.lang === 'he' ? 'ראשי תיבות' : 'Initials'}: ${initials(body.name)} · Igani ${initials(signer.name || 'Igani')} · ${offer.slug.toUpperCase()}` })
    } else pdf = await buildSignedPdf({
      contract: await downloadContract(offer.contractPublicId!),
      offerTitle: offer.title,
      clientName,
      offerUrl,
      modules: modules.filter((m) => selected.includes(m.id)).map((m) => ({ name: m.name, price: formatModulePrice(m, offer.currency) })),
      oneTimeTotal: formatPrice(total, offer.currency),
      monthly: monthlyText,
      yearly: yearlyText,
      signerName: body.name,
      signerEmail: body.email,
      signedAt,
      ip,
      signaturePng: Buffer.from(body.signature.slice(PNG_PREFIX.length), 'base64'),
    })
  } catch (err) {
    console.error('[offers] could not build the signed PDF', err)
    return NextResponse.json({ error: 'We could not prepare the signed agreement. Please try again or contact us.' }, { status: 502 })
  }
  const fileName = `${offer.slug}-signed-${signedAt.toISOString().slice(0, 10)}.pdf`

  const claimed = await prisma.$transaction(async (tx) => {
    // Only one signature per offer, even if two tabs submit at once
    const { count } = await tx.offer.updateMany({
      where: { id: offer.id, status: 'LIVE' },
      data: { status: 'SIGNED', signedAt, signerName: body.name, signerEmail: body.email, signerIp: ip, signerTitle: body.title || null, signerPhone: body.phone || null, signedTotal: total, selectedModules: selected },
    })
    if (count === 0) return false
    const doc = await tx.leadDocument.create({
      data: { leadId: offer.leadId, title: `Signed agreement: ${offer.title}`, fileName, mimeType: 'application/pdf', size: pdf.byteLength, data: Buffer.from(pdf), uploadedById: null },
      select: { id: true },
    })
    await tx.offer.update({ where: { id: offer.id }, data: { signedDocumentId: doc.id } })
    if ((SIGNABLE_LEAD_STAGES as readonly string[]).includes(offer.lead.status)) {
      await tx.lead.update({ where: { id: offer.leadId }, data: { status: 'SIGNED' } })
      await tx.activityLog.create({ data: { entityType: 'LEAD', entityId: offer.leadId, action: 'lead.status_changed', metadata: { from: offer.lead.status, to: 'SIGNED', auto: 'offer-signed', offerId: offer.id } } })
    }
    await logActivity({ entityType: 'LEAD', entityId: offer.leadId, action: 'offer.signed', metadata: { offerId: offer.id, slug: offer.slug, signerName: body.name, signerEmail: body.email, total, monthly: recurring.month, yearly: recurring.year, currency: offer.currency, modules: selected, ip } }, tx)
    await createAutoTask(
      {
        leadId: offer.leadId,
        title: `Send the down-payment invoice (${offer.title}, ${formatPrice(total, offer.currency)} signed)`,
        dueAt: new Date(signedAt.getTime() + 24 * 3600_000),
        assigneeId: offer.createdById ?? offer.lead.assignedToId,
        priority: 'HIGH',
        auto: 'invoice',
        offerId: offer.id,
      },
      tx,
    )
    return true
  })
  if (!claimed) return NextResponse.json({ error: 'This offer was already signed.' }, { status: 409 })

  // Emails go out after the signature is safely stored; a mail failure must not undo the signature.
  const when = new Intl.DateTimeFormat(body.lang === 'he' ? 'he-IL' : 'en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long', timeStyle: 'short' }).format(signedAt)
  const common = { signerName: body.name, clientName, offerTitle: offer.title, total: formatPrice(total, offer.currency), monthly: monthlyText, yearly: yearlyText, signedAt: when, offerUrl }
  const attachment = { filename: fileName, content: Buffer.from(pdf) }
  const team = await teamRecipients(offer.createdById, offer.lead.assignedToId, ...offer.memberIds)
  const results = await Promise.allSettled([
    sendOfferSignedEmail(body.email, { ...common, audience: 'client', lang: body.lang }, attachment),
    team.length ? sendOfferSignedEmail(team, { ...common, audience: 'team', lang: 'en', leadUrl: appUrl(`/sales/leads/${offer.leadId}`) }, attachment) : Promise.resolve('no-team'),
  ])
  for (const r of results) if (r.status === 'rejected') console.error('[offers] signed email failed', r.reason)

  return NextResponse.json({ ok: true, signedAt: signedAt.toISOString() })
}

/** Who at Igani gets the signed copy: the offer's creator and invited teammates, the lead's owner, and ADMIN_NOTIFY_EMAIL. */
async function teamRecipients(...userIds: (string | null)[]): Promise<string[]> {
  const ids = userIds.filter((x): x is string => !!x)
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { email: true } }) : []
  const extra = (env().ADMIN_NOTIFY_EMAIL ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return [...new Set([...users.map((u) => u.email).filter((e): e is string => !!e), ...extra].map((e) => e.toLowerCase()))]
}
