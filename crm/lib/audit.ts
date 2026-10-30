import type { EntityType, Prisma, PrismaClient } from '@prisma/client'
import { prisma } from './prisma'

type Db = PrismaClient | Prisma.TransactionClient

export interface AuditEntry {
  entityType: EntityType
  entityId: string
  action: string
  actorId?: string | null
  metadata?: Prisma.InputJsonValue
}

/** Append-only audit log. Pass a transaction client to log atomically with the change. */
export async function logActivity(entry: AuditEntry, db: Db = prisma): Promise<void> {
  await db.activityLog.create({
    data: {
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId ?? null,
      metadata: entry.metadata,
    },
  })
}
