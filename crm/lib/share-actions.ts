/** Deterministic safety net: an item shared by several teammates gets one "Who: task" line per teammate. */
const words = (s: string): string[] => s.toLowerCase().match(/[a-z0-9']{3,}/g) ?? []
const NAME_SPLIT = /\s*(?:,|&|\band\b|\+|\/)\s*/i

export function shareActions(actions: string[], text: string, team: string[]): string[] {
  const names = team.map((t) => t.trim()).filter(Boolean)
  const find = (n: string): string | undefined => names.find((t) => t.toLowerCase() === n.trim().toLowerCase())
  const out: string[] = []
  const add = (l: string): void => { if (!out.some((o) => o.toLowerCase() === l.toLowerCase())) out.push(l) }
  // 1) lines the model wrote as "Gabriel and Dana: task"
  const base: string[] = []
  for (const a of actions) {
    const m = a.match(/^\s*([^:：]{1,60})[:：]\s+(.+)$/)
    const parts = m ? m[1]!.split(NAME_SPLIT).filter(Boolean) : []
    if (m && parts.length > 1 && parts.length <= 5) parts.forEach((p) => base.push(`${p.trim()}: ${m[2]!.trim()}`))
    else base.push(a)
  }
  // 2) sentences in the notes that name several teammates as the subject
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean)
  for (const line of base) {
    add(line)
    const m = line.match(/^\s*([^:：]{1,40})[:：]\s+(.+)$/)
    if (!m || !find(m[1]!)) continue
    const tw = [...new Set(words(m[2]!))]
    if (!tw.length) continue
    for (const s of sentences) {
      const sw = new Set(words(s))
      if (tw.filter((w) => sw.has(w)).length / tw.length < 0.6) continue
      const subj = s.split(/\b(?:will|to|should|needs?|going|are|is|can|must|'ll)\b|[:,]\s+(?=[a-z])/i)[0] ?? ''
      const named = names.filter((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(subj))
      if (named.length > 1 && named.some((n) => n.toLowerCase() === m[1]!.trim().toLowerCase())) named.forEach((n) => add(`${n}: ${m[2]!.trim()}`))
    }
  }
  return out
}
