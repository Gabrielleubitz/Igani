import { z } from 'zod'

/** Meeting notes in a fixed, scannable shape (what the CRM shows instead of the raw Gemini text). */
export const organizedSchema = z.object({
  overview: z.array(z.string()).max(8),
  decisions: z.array(z.string()).max(15),
  actions: z.array(z.string()).max(20),
  topics: z.array(z.object({ title: z.string(), points: z.array(z.string()).max(10) })).max(12),
})
export type OrganizedNotes = z.infer<typeof organizedSchema>

const HEADING = /^(?:#+\s*)?(summary|decisions?|suggested next steps|next steps|action items|details|transcript)\s*:?\s*$/i
const BULLET = /^\s*(?:[•\-*–]|\d+[.)])\s+/

const clean = (s: string): string => s.replace(BULLET, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()

/** Splits a block of lines into points: bullets stay separate, plain lines join into sentences. */
function points(lines: string[]): string[] {
  const out: string[] = []
  let para = ''
  const flush = (): void => {
    if (para.trim()) out.push(clean(para))
    para = ''
  }
  for (const l of lines) {
    if (!l.trim()) flush()
    else if (BULLET.test(l)) {
      flush()
      out.push(clean(l))
    } else para += ` ${l.trim()}`
  }
  flush()
  return out.filter((p) => p.length > 1)
}

/** What to show for a call: the AI-tidied version if there is one, else the free tidy-up of the raw notes. */
export function organizedFor(m: { organizedJson: unknown; fullText: string | null }): { notes: OrganizedNotes | null; ai: boolean } {
  const ai = organizedSchema.safeParse(m.organizedJson)
  return ai.success ? { notes: ai.data, ai: true } : { notes: organizeNotes(m.fullText), ai: false }
}

/** Free (no AI) tidy-up of Gemini notes: Summary / Decisions / Next steps / Details into short lists. */
export function organizeNotes(text: string | null | undefined): OrganizedNotes | null {
  if (!text?.trim()) return null
  // The Doc has a Quick notes tab and a Full notes tab with the same headings: keep the fuller version of each.
  const sec = new Map<string, string[]>()
  let cur: string | null = null
  let buf: string[] = []
  const commit = (): void => {
    if (cur && buf.join('').length > (sec.get(cur)?.join('').length ?? -1)) sec.set(cur, buf)
    buf = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const m = line.match(HEADING)
    if (m) {
      const k = m[1]!.toLowerCase().replace('suggested ', '').replace('action items', 'next steps').replace(/^decisions?$/, 'decisions')
      commit()
      cur = k === 'transcript' ? null : k
      continue
    }
    if (/^#\s/.test(line)) {
      commit()
      cur = null
      continue
    }
    if (cur) buf.push(raw)
  }
  commit()
  const topics = points(sec.get('details') ?? [])
    .map((p) => {
      const i = p.indexOf(': ')
      return i > 2 && i < 90 ? { title: p.slice(0, i), points: [p.slice(i + 2)] } : { title: '', points: [p] }
    })
    .slice(0, 12)
  const o: OrganizedNotes = {
    overview: points(sec.get('summary') ?? []).slice(0, 8),
    decisions: points(sec.get('decisions') ?? []).slice(0, 15),
    actions: points(sec.get('next steps') ?? []).slice(0, 20),
    topics,
  }
  return o.overview.length || o.decisions.length || o.actions.length || o.topics.length ? o : null
}
