/** Rules for salesperson agreements (documents an admin uploads for one salesperson). Pure, so they are unit tested. */
export const MAX_AGREEMENT_BYTES = 4 * 1024 * 1024 // Vercel functions accept request bodies up to 4.5 MB

export const AGREEMENT_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'image/png': 'Image',
  'image/jpeg': 'Image',
  'text/plain': 'Text',
}

/** Returns why an upload is refused, or null when it is fine. */
export function agreementUploadProblem(file: { name: string; type: string; size: number }): string | null {
  if (file.size <= 0) return 'That file is empty.'
  if (file.size > MAX_AGREEMENT_BYTES) return `That file is too big. The limit is ${MAX_AGREEMENT_BYTES / 1024 / 1024} MB.`
  if (!(file.type in AGREEMENT_TYPES)) return 'Upload a PDF, Word document, image (PNG/JPG) or text file.'
  return null
}

/** Admins can open any agreement; everyone else only their own. */
export function canOpenAgreement(user: { id: string; role: string }, agreement: { userId: string }): boolean {
  return user.role === 'ADMIN' || agreement.userId === user.id
}

/** A header-safe download name. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').trim()
  return cleaned.slice(0, 120) || 'agreement'
}

export function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}
