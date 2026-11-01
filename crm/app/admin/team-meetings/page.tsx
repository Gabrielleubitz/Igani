import { redirect } from 'next/navigation'

/** Team meetings now live on the Book meeting with team page (admins see the tracked calls there). */
export default function TeamMeetingsRedirect(): never {
  redirect('/sales/team-meeting')
}
