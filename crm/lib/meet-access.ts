import type { Role } from '@prisma/client'

/**
 * Who runs a meeting: its host, or any admin. They can invite and remove people, end it, and play or delete its
 * recordings. Every teammate can start meetings of their own.
 */
export function canManageMeet(user: { id: string; role: Role }, room: { hostId: string | null }): boolean {
  return user.role === 'ADMIN' || (room.hostId !== null && room.hostId === user.id)
}
