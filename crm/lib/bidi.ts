/**
 * PDF text is drawn left to right, glyph by glyph, with no bidi support. To show Hebrew correctly inside an
 * otherwise left-to-right line, reverse each Hebrew run (so its letters read right to left) and reverse the order
 * of consecutive Hebrew runs within a right-to-left stretch. Good enough for names, titles and short phrases.
 */
const HEBREW = /[֐-׿]/
const RTL_RUN = /[֐-׿][֐-׿\s"'׳״\-–.,()]*[֐-׿]|[֐-׿]/g

export function visualOrder(text: string): string {
  if (!HEBREW.test(text)) return text
  return text.replace(RTL_RUN, (run) => mirror([...run].reverse().join('')))
}

/** Brackets flip when a run is reversed. */
function mirror(s: string): string {
  return s.replace(/[()]/g, (c) => (c === '(' ? ')' : '('))
}
