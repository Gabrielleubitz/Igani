'use client'

import { Loader2, Pause, Play, RotateCcw, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState, useTransition } from 'react'
import { reanalyzeCall } from '@/app/actions/calls'
import { cn } from '@/lib/utils'

const fmt = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

/** The recording, shared so the transcript and coaching moments can jump to a point in the call. */
const PlayerContext = createContext<{ seek: (sec: number) => void; time: number } | null>(null)

export function CallPlayerProvider({ src, durationSec, children }: { src: string | null; durationSec: number | null; children: React.ReactNode }): React.ReactElement {
  const audio = useRef<HTMLAudioElement>(null)
  const [time, setTime] = useState(0)
  const [dur, setDur] = useState(durationSec ?? 0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [error, setError] = useState(false)
  const seek = (sec: number): void => {
    const a = audio.current
    if (!a) return
    a.currentTime = Math.max(0, sec - 1)
    void a.play()
  }
  return (
    <PlayerContext.Provider value={{ seek, time }}>
      {src ? (
        <div className="sticky top-2 z-10 rounded-xl border bg-card p-3 shadow-lg shadow-black/20">
          <audio
            ref={audio}
            src={src}
            preload="metadata"
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setDur(e.currentTarget.duration)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => setError(true)}
          />
          {error ? (
            <p className="px-1 text-sm text-muted-foreground">The recording isn’t available right now. Try again in a minute.</p>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => (playing ? audio.current?.pause() : void audio.current?.play())}
                aria-label={playing ? 'Pause' : 'Play'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="ms-0.5 h-4 w-4" />}
              </button>
              <span className="w-10 text-end text-xs tabular-nums text-muted-foreground">{fmt(time)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, dur)}
                step={0.1}
                value={Math.min(time, dur || time)}
                onChange={(e) => {
                  if (audio.current) audio.current.currentTime = Number(e.target.value)
                }}
                aria-label="Position in the call"
                className="h-1.5 flex-1 cursor-pointer accent-[hsl(var(--primary))]"
              />
              <span className="w-10 text-xs tabular-nums text-muted-foreground">{fmt(dur)}</span>
              <button
                type="button"
                onClick={() => {
                  const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1
                  setRate(next)
                  if (audio.current) audio.current.playbackRate = next
                }}
                className="w-11 shrink-0 rounded-md border px-1.5 py-1 text-xs tabular-nums text-muted-foreground hover:text-foreground"
                aria-label="Playback speed"
              >
                {rate}×
              </button>
            </div>
          )}
        </div>
      ) : null}
      {children}
    </PlayerContext.Provider>
  )
}

/** The shared player (seek + current time), or null outside a call page. */
export function useCallPlayer(): { seek: (sec: number) => void; time: number } | null {
  return useContext(PlayerContext)
}

/** "▶ 1:24" — jumps the player to that moment. */
export function SeekButton({ at, label }: { at: number; label?: string }): React.ReactElement | null {
  const player = useContext(PlayerContext)
  if (!player) return null
  return (
    <button type="button" onClick={() => player.seek(at)} className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground transition hover:border-primary/50 hover:text-foreground">
      <Play className="h-3 w-3" aria-hidden /> {label ?? fmt(at)}
    </button>
  )
}

/** The transcript as a conversation; the line being played is highlighted, and any line can be clicked to play it. */
export function Transcript({ lines, repName }: { lines: { start: number; end: number; text: string; speaker: 'rep' | 'client' }[]; repName: string }): React.ReactElement {
  const player = useContext(PlayerContext)
  const [all, setAll] = useState(false)
  const shown = all ? lines : lines.slice(0, 40)
  return (
    <div className="space-y-1.5">
      {shown.map((l, i) => {
        const now = player && player.time >= l.start && player.time < l.end
        const rep = l.speaker === 'rep'
        return (
          <button
            key={i}
            type="button"
            onClick={() => player?.seek(l.start + 1)}
            className={cn('flex w-full gap-3 rounded-lg px-2 py-1.5 text-start text-sm transition', now ? 'bg-primary/15' : 'hover:bg-muted/40')}
          >
            <span className="w-10 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground">{fmt(l.start)}</span>
            <span className={cn('w-16 shrink-0 pt-0.5 text-xs font-semibold', rep ? 'text-primary' : 'text-amber-300')}>{rep ? repName : 'Client'}</span>
            <span dir="auto" className="min-w-0 flex-1 leading-relaxed">
              {l.text}
            </span>
          </button>
        )
      })}
      {lines.length > 40 && !all ? (
        <button type="button" onClick={() => setAll(true)} className="ms-2 text-sm text-primary hover:underline">
          Show the whole transcript ({lines.length} lines)
        </button>
      ) : null}
    </div>
  )
}

/** While the analysis is running, check back every few seconds. */
export function AnalysisRefresher({ active }: { active: boolean }): null {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => router.refresh(), 6000)
    return () => window.clearInterval(t)
  }, [active, router])
  return null
}

export function ReanalyzeButton({ callId, label = 'Analyze again' }: { callId: string; label?: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null)
            const r = await reanalyzeCall(callId)
            if (!r.ok) setMsg(r.error)
            router.refresh()
          })
        }
        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : label === 'Analyze now' ? <Sparkles className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
        {pending ? 'Analyzing… (up to a minute)' : label}
      </button>
      {msg ? <span className="text-xs text-rose-400">{msg}</span> : null}
    </span>
  )
}
