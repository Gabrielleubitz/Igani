/** Shared bits for showing calls and their analysis. */
export const RUBRIC: { key: 'opening' | 'discovery' | 'listening' | 'value' | 'objections' | 'closing'; label: string; hint: string }[] = [
  { key: 'opening', label: 'Opening', hint: 'Set the tone and the reason for the call' },
  { key: 'discovery', label: 'Discovery', hint: 'Uncovered real pain, impact and urgency (SPIN depth)' },
  { key: 'listening', label: 'Listening', hint: 'Paraphrased, followed up, built on what the client said' },
  { key: 'value', label: 'Value', hint: 'Tied what we build to their needs' },
  { key: 'objections', label: 'Objections', hint: 'Listened, acknowledged, explored, responded, checked it was resolved' },
  { key: 'closing', label: 'Next step', hint: 'Secured a clear, dated next step' },
]

/** Score colour: green 75+, amber 50–74, red below 50. */
export const scoreTone = (score: number): { text: string; bg: string; ring: string } =>
  score >= 75 ? { text: 'text-emerald-300', bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30' } : score >= 50 ? { text: 'text-amber-300', bg: 'bg-amber-500/15', ring: 'ring-amber-500/30' } : { text: 'text-rose-300', bg: 'bg-rose-500/15', ring: 'ring-rose-500/30' }

export const CALL_STATUS_LABEL: Record<string, string> = { INITIATED: 'Starting', RINGING: 'Ringing', IN_PROGRESS: 'On the call', COMPLETED: 'Answered', BUSY: 'Busy', NO_ANSWER: 'No answer', FAILED: 'Failed', CANCELED: 'Hung up' }
