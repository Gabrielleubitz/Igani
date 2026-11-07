import 'server-only'
import { prisma } from './prisma'
import { CONTRACT_VERSION } from './sales-contract-core'

/** True when this salesperson has not signed the current commission agreement. */
export async function needsNewAgreement(email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  const latest = await prisma.agreementAcceptance.findFirst({ where: { email: email.toLowerCase() }, orderBy: { signedAt: 'desc' }, select: { version: true } })
  return latest?.version !== CONTRACT_VERSION
}
