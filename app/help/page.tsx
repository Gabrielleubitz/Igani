import { redirect } from 'next/navigation'

/**
 * Legacy /help URL redirects to AlmaLinks product help.
 * Product-specific pages live at /help/[productSlug] (e.g. /help/almalinks, /help/capital).
 * AlmaLinks app should link to: https://igani.co/help/almalinks?src=almalinks
 */
export default function HelpPage() {
  redirect('/help/almalinks')
}
