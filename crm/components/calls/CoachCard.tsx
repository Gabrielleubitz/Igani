'use client'

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import type { CoachCard as Card } from '@/lib/call-coach'
import { cn } from '@/lib/utils'

/** A small score ring: 0-100, coloured by how the call went. */
function Ring({ score }: { score: number }): React.ReactElement {
  const r = 22
  const c = 2 * Math.PI * r
  const tone = score >= 70 ? 'stroke-emerald-500' : score >= 45 ? 'stroke-amber-500' : 'stroke-rose-500'
  return (
    <div className="relative h-14 w-14 shrink-0" role="img" aria-label={`Call score ${score} out of 100`}>
      <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden>
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-muted" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(Math.max(0, Math.min(100, score)) / 100) * c} ${c}`} className={tone} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums">{score}</span>
    </div>
  )
}

function Block({ label, tone, children }: { label: string; tone: 'win' | 'fix'; children: React.ReactNode }): React.ReactElement {
  return (
    <div className={cn('rounded-xl border-l-[3px] bg-muted/40 py-2 pl-3 pr-3', tone === 'win' ? 'border-emerald-500' : 'border-amber-500')}>
      <div className={cn('text-[11px] font-semibold uppercase tracking-wide', tone === 'win' ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300')}>{label}</div>
      <p dir="auto" className="mt-0.5 text-[13px] leading-snug">
        {children}
      </p>
    </div>
  )
}

function CopyButton({ text }: { text: string }): React.ReactElement {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setDone(true)
            window.setTimeout(() => setDone(false), 1800)
          })
          .catch(() => undefined)
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10"
      aria-label="Copy the suggested sentence"
    >
      {done ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
      {done ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * The short coaching card: score and verdict, one win, one improvement, one sentence to try, one challenge (smallest).
 * Everything comes from the stored review; a part with no source is not drawn.
 */
export function CoachCard({ card }: { card: Card }): React.ReactElement {
  if (card.notSales) return <p className="rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">This wasn’t a sales call, so there’s no coaching for it.</p>
  if (card.sparse) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {card.score !== null ? <Ring score={card.score} /> : null}
          {card.verdict ? (
            <p dir="auto" className="text-[13px] font-medium leading-snug">
              {card.verdict}
            </p>
          ) : null}
        </div>
        <p className="rounded-xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">We couldn’t pull a quick summary from this call. The full review has the details.</p>
      </div>
    )
  }
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        {card.score !== null ? <Ring score={card.score} /> : null}
        {card.verdict ? (
          <p dir="auto" className="line-clamp-3 text-[13px] font-medium leading-snug">
            {card.verdict}
          </p>
        ) : null}
      </div>
      {card.win ? (
        <Block label="What worked" tone="win">
          {card.win}
        </Block>
      ) : null}
      {card.fix ? (
        <Block label="Worth improving" tone="fix">
          {card.fix}
        </Block>
      ) : null}
      {card.say ? (
        <figure className="rounded-xl bg-primary/10 px-3 py-2.5 ring-1 ring-primary/20">
          <div className="flex items-center justify-between">
            <figcaption className="text-[11px] font-semibold uppercase tracking-wide text-primary">Try saying</figcaption>
            <CopyButton text={card.say} />
          </div>
          <blockquote dir="auto" className="mt-1 text-[13.5px] font-medium leading-snug">
            “{card.say}”
          </blockquote>
        </figure>
      ) : null}
      {card.challenge ? (
        <p dir="auto" className="border-t border-border/60 pt-2 text-[11.5px] leading-snug text-muted-foreground">
          <span className="font-medium">Next-call challenge{card.challenge.skill ? ` · ${card.challenge.skill}` : ''}:</span> {card.challenge.text}
        </p>
      ) : null}
    </div>
  )
}
