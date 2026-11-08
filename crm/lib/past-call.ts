/** Rules for an admin adding a past call (a training call, say) by uploading its audio. Pure: no database. */

/** Vercel's request body limit is about 4.5 MB, so keep a little under it. */
export const MAX_PAST_CALL_BYTES = 4 * 1024 * 1024

const EXTENSIONS = ['m4a', 'mp3', 'wav', 'webm', 'ogg', 'aac', 'mp4']

/** Why this file can't be used, or null when it can. */
export function pastCallFileError(file: { name: string; size: number; type?: string }): string | null {
  if (!file.size) return 'The file is empty.'
  if (file.size > MAX_PAST_CALL_BYTES) return `The file is over ${MAX_PAST_CALL_BYTES / 1024 / 1024} MB. Upload a shorter or smaller recording.`
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const audio = (file.type ?? '').startsWith('audio/') || EXTENSIONS.includes(ext)
  return audio ? null : 'Upload an audio file (m4a, mp3, wav, ogg or webm).'
}

/** The call date from the form (YYYY-MM-DD), noon UTC; today when empty. Null when it isn't a real date or lies in the future. */
export function pastCallDate(value: string | null | undefined, now = new Date()): Date | null {
  if (!value) return now
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null
  return d.getTime() > now.getTime() ? null : d
}
