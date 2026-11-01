/** Reading a shekel amount typed by a person. Whole shekels; commas, spaces and ₪ are fine; anything else is refused. */
export type MoneyInput = { ok: true; value: number | null } | { ok: false; error: string }

export function parseShekels(text: string): MoneyInput {
  const cleaned = text.replace(/[₪\s,]/g, '')
  if (cleaned === '') return { ok: true, value: null }
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { ok: false, error: 'Use numbers only, like 17000 or 17,000.' }
  const n = Math.round(Number(cleaned))
  if (!Number.isFinite(n) || n > 1_000_000_000) return { ok: false, error: 'That amount is too large.' }
  return { ok: true, value: n }
}
