import { revalidatePath } from 'next/cache'

/**
 * Booking counts (dashboard "meetings today", the pending-approvals badge, lists) are read live from the database,
 * so any change to a booking, whether made in the CRM or pulled in from Google Calendar, must drop the cached pages.
 */
export function refreshBookingCounters(): void {
  revalidatePath('/', 'layout')
}
