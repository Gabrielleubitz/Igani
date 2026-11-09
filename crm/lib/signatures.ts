import 'server-only'
import { prisma } from './prisma'

/**
 * Igani's saved signatures (Settings → Signatures). Sales contracts and offer contracts pick one when they're signed; an
 * approved offer keeps a copy (SignerSnapshot), so editing or deleting a signature later never changes a signed contract.
 */

export interface SignatureView {
  id: string
  label: string
  name: string
  title: string
  email: string
  phone: string
  image: string
  isDefault: boolean
  updatedAt: string
}

export interface SignerSnapshot {
  name: string
  title: string
  email: string
  phone: string
  image: string
}

export async function listSignatures(): Promise<SignatureView[]> {
  const rows = await prisma.signature.findMany({ where: { archivedAt: null }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] })
  return rows.map((r) => ({ id: r.id, label: r.label, name: r.name, title: r.title, email: r.email, phone: r.phone, image: r.image, isDefault: r.isDefault, updatedAt: r.updatedAt.toISOString() }))
}

/** The chosen signature (or the default when none is chosen) as a copy to keep on a contract. */
export async function signerSnapshot(id?: string | null): Promise<SignerSnapshot | null> {
  const row = id
    ? await prisma.signature.findFirst({ where: { id, archivedAt: null } })
    : ((await prisma.signature.findFirst({ where: { isDefault: true, archivedAt: null } })) ?? (await prisma.signature.findFirst({ where: { archivedAt: null }, orderBy: { createdAt: 'asc' } })))
  return row ? { name: row.name, title: row.title, email: row.email, phone: row.phone, image: row.image } : null
}

export function readSnapshot(v: unknown): SignerSnapshot | null {
  if (!v || typeof v !== 'object') return null
  const s = v as Partial<SignerSnapshot>
  return typeof s.name === 'string' && typeof s.image === 'string' ? { name: s.name, title: s.title ?? '', email: s.email ?? '', phone: s.phone ?? '', image: s.image } : null
}
