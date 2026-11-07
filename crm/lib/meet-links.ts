import 'server-only'
import { headers } from 'next/headers'
import { appUrl } from './env'
import { isMeetHost } from './meet-host'

/**
 * A full link to a Meet page, given the path inside Meet ("/", "/<code>?t=…"). With MEET_URL set it's on the Meet host
 * (https://meet.igani.co/<code>), otherwise the CRM's own /meet pages.
 */
export function meetUrl(path = '/'): string {
  const base = process.env.MEET_URL
  if (base) return new URL(path, base).toString()
  return appUrl(path === '/' ? '/meet' : `/meet${path}`)
}

/** Whether this request came in on the Meet host. */
export async function onMeetHost(): Promise<boolean> {
  return isMeetHost((await headers()).get('host'))
}

/** How links inside Meet start on this host: "" on meet.igani.co, "/meet" inside the CRM. */
export async function meetBase(): Promise<'' | '/meet'> {
  return (await onMeetHost()) ? '' : '/meet'
}
