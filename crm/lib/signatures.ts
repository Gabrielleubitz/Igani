import 'server-only'
import { prisma } from './prisma'

/**
 * Igani's saved signatures (Settings → Signatures). Sales contracts and offer contracts pick one when they're signed; an
 * approved offer keeps a copy (SignerSnapshot), so editing or deleting a signature later never changes a signed contract.
 */

export interface SignatureView {
  id: string
  /** the admin it belongs to (null for one whose admin was removed) */
  userId: string | null
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

/** A signature with its admin's current name and email (their profile wins over what was saved). */
type Row = Awaited<ReturnType<typeof prisma.signature.findFirst>> & { user?: { name: string | null; email: string | null } | null }
function live(r: NonNullable<Row>): { name: string; email: string } {
  return { name: r.user?.name?.trim() || r.name, email: r.user?.email || r.email }
}
const labelOf = (name: string, title: string): string => (title ? `${name} · ${title}` : name)

export async function listSignatures(): Promise<SignatureView[]> {
  const rows = await prisma.signature.findMany({ where: { archivedAt: null }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }], include: { user: { select: { name: true, email: true } } } })
  return rows.map((r) => {
    const { name, email } = live(r)
    return { id: r.id, userId: r.userId, label: labelOf(name, r.title), name, title: r.title, email, phone: r.phone, image: r.image, isDefault: r.isDefault, updatedAt: r.updatedAt.toISOString() }
  })
}

export interface SignerAdmin {
  id: string
  name: string
  email: string
  /** their Igani line, suggested as the phone on the contract */
  phone: string
}

/** The admins a signature can belong to (active admins on the access list). */
export async function signatureAdmins(): Promise<SignerAdmin[]> {
  const allowed = await prisma.allowedUser.findMany({ where: { role: 'ADMIN', active: true }, select: { email: true } })
  const users = await prisma.user.findMany({ where: { email: { in: allowed.map((a) => a.email) } }, select: { id: true, name: true, email: true, phoneLine: { select: { number: true, active: true } } }, orderBy: { name: 'asc' } })
  return users.map((u) => ({ id: u.id, name: u.name?.trim() || (u.email ?? '').split('@')[0] || 'Admin', email: u.email ?? '', phone: u.phoneLine?.active ? u.phoneLine.number : '' }))
}

/** The chosen signature (or the default when none is chosen) as a copy to keep on a contract. */
export async function signerSnapshot(id?: string | null): Promise<SignerSnapshot | null> {
  const include = { user: { select: { name: true, email: true } } }
  const row = id
    ? await prisma.signature.findFirst({ where: { id, archivedAt: null }, include })
    : ((await prisma.signature.findFirst({ where: { isDefault: true, archivedAt: null }, include })) ?? (await prisma.signature.findFirst({ where: { archivedAt: null }, orderBy: { createdAt: 'asc' }, include })))
  if (!row) return null
  const { name, email } = live(row)
  return { name, title: row.title, email, phone: row.phone, image: row.image }
}

export function readSnapshot(v: unknown): SignerSnapshot | null {
  if (!v || typeof v !== 'object') return null
  const s = v as Partial<SignerSnapshot>
  return typeof s.name === 'string' && typeof s.image === 'string' ? { name: s.name, title: s.title ?? '', email: s.email ?? '', phone: s.phone ?? '', image: s.image } : null
}
