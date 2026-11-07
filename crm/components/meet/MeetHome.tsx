'use client'

import { CalendarPlus, Check, ChevronLeft, ChevronRight, CircleDot, Copy, Keyboard, LayoutGrid, Link2, Loader2, Plus, Send, Settings, ShieldCheck, Video, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { addMeetInvites, createMeetRoom } from '@/app/actions/meet'
import { cn } from '@/lib/utils'
import { Invitees, NewMeetForm, RoomCard, type RoomView, type Teammate } from './MeetAdmin'

export interface MeetStatus {
  configured: boolean
  problem: string | null
  ready: boolean
  recording: boolean
  storage: boolean
  webhookUrl: string
}

const BLUE_BTN = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#a8c7fa] font-medium text-[#062e6f] transition hover:bg-[#b9d2fb] hover:shadow-lg hover:shadow-[#a8c7fa]/10 active:scale-[0.98] disabled:opacity-50'

/** A Google Meet-style home for Igani Meet: start or schedule a meeting, join by code, and manage your meetings. */
export function MeetHome({ me, status, teammates, rooms }: { me: { name: string; email: string; avatar: string | null }; status: MeetStatus; teammates: Teammate[]; rooms: RoomView[] }): React.ReactElement {
  const router = useRouter()
  const [now, setNow] = useState<number | null>(null)
  const [menu, setMenu] = useState(false)
  const [dialog, setDialog] = useState<'later' | 'schedule' | 'setup' | null>(null)
  const [later, setLater] = useState<{ code: string } | null>(null)
  const [code, setCode] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'open' | 'ended'>('open')
  const [pending, start] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tick = (): void => setNow(Date.now())
    queueMicrotask(tick)
    const t = setInterval(tick, 15_000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    if (!menu) return
    const off = (e: PointerEvent): void => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    window.addEventListener('pointerdown', off)
    return () => window.removeEventListener('pointerdown', off)
  }, [menu])

  const first = me.name.split(' ')[0] || 'My'
  const create = (instant: boolean): void => {
    setMenu(false)
    setErr(null)
    start(async () => {
      const r = await createMeetRoom({ title: `${first}’s meeting`, send: false })
      if (!r.ok) return setErr(r.error)
      if (instant) router.push(`/meet/${r.data.code}`)
      else {
        router.refresh()
        setLater({ code: r.data.code })
        setDialog('later')
      }
    })
  }
  const join = (): void => {
    const v = code.trim()
    if (!v) return
    const m = /\/meet\/([a-z0-9-]+)(\?[^#\s]*)?/i.exec(v)
    if (m) return router.push(`/meet/${m[1]!.toLowerCase()}${m[2] ?? ''}`)
    const c = v.toLowerCase().replace(/\s+/g, '')
    router.push(`/meet/${c.startsWith('igani-') ? c : `igani-${c}`}`)
  }
  const open = rooms.filter((r) => !r.ended)
  const ended = rooms.filter((r) => r.ended)
  const laterRoom = later ? rooms.find((r) => r.code === later.code) : null

  return (
    <div className="dark min-h-screen bg-[#0e1626] text-[#e3e8f0]">
      <header className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <Link href="/meet" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand icon */}
          <img src="/meet/igani-meet-icon.png" alt="" className="h-10 w-10 rounded-[24%] shadow-lg shadow-black/30" />
          <span className="text-[22px] tracking-tight">
            Igani <span className="text-[#8cc4f5]">Meet</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {now ? (
            <span className="hidden pr-2 text-[17px] text-[#c4cbd6] md:block">
              {new Date(now).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} • {new Date(now).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          ) : null}
          <button type="button" onClick={() => setDialog('setup')} aria-label="Settings" title="Settings" className="relative rounded-full p-2.5 text-[#c4cbd6] transition hover:bg-white/10">
            <Settings className="h-6 w-6" />
            {status.problem || !status.configured || !status.recording ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" /> : null}
          </button>
          <Link href="/sales/today" aria-label="Back to the CRM" title="Back to the CRM" className="rounded-full p-2.5 text-[#c4cbd6] transition hover:bg-white/10">
            <LayoutGrid className="h-6 w-6" />
          </Link>
          <span className="ml-1 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#6aa6ff] to-[#2f5fd0] text-sm font-semibold" title={`${me.name}\n${me.email}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- small profile photo */}
            {me.avatar ? <img src={me.avatar} alt="" className="h-full w-full object-cover" /> : me.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 py-10 lg:min-h-[calc(100vh-4rem-120px)] lg:grid-cols-[1fr_1fr] lg:gap-16 lg:px-10">
        <section className="max-w-[560px]">
          <h1 className="text-[36px] font-normal leading-[1.2] tracking-tight sm:text-[44px]">Video calls and meetings for Igani</h1>
          <p className="mt-4 text-lg text-[#9aa4b2]">Meet clients and the team from anywhere, in a space that looks and sounds like Igani.</p>
          {status.problem ? <p className="mt-5 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-400/30">{status.problem}</p> : !status.ready ? <p className="mt-5 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-100 ring-1 ring-amber-400/30">Igani Meet isn’t connected yet. Open settings (top right) to finish setup.</p> : null}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <div ref={menuRef} className="relative">
              <button type="button" disabled={!status.ready || pending} onClick={() => setMenu((v) => !v)} className={cn(BLUE_BTN, 'h-12 px-5 text-[15px]')}>
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5" />} New meeting
              </button>
              {menu ? (
                <div className="meet-pop absolute left-0 top-[calc(100%+6px)] z-30 w-72 rounded-lg bg-[#232d3f] py-2 shadow-2xl ring-1 ring-white/10">
                  <HomeItem icon={<Link2 />} onClick={() => create(false)}>
                    Create a meeting for later
                  </HomeItem>
                  <HomeItem icon={<Plus />} onClick={() => create(true)}>
                    Start an instant meeting
                  </HomeItem>
                  <HomeItem
                    icon={<CalendarPlus />}
                    onClick={() => {
                      setMenu(false)
                      setDialog('schedule')
                    }}
                  >
                    Schedule and invite people
                  </HomeItem>
                </div>
              ) : null}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                join()
              }}
              className="flex items-center gap-2"
            >
              <label className="flex h-12 w-[min(260px,70vw)] items-center gap-3 rounded-md border border-[#8e918f] px-3.5 transition focus-within:border-2 focus-within:border-[#a8c7fa]">
                <Keyboard className="h-5 w-5 shrink-0 text-[#c4cbd6]" />
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter a code or link" aria-label="Enter a code or link" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#9aa4b2] focus-visible:ring-0 focus-visible:ring-offset-0" />
              </label>
              <button type="submit" disabled={!code.trim()} className="rounded-full px-4 py-3 text-[15px] font-medium text-[#a8c7fa] transition hover:bg-[#a8c7fa]/10 disabled:text-[#5b6575] disabled:hover:bg-transparent">
                Join
              </button>
            </form>
          </div>
          {err ? <p className="mt-3 text-sm text-rose-300">{err}</p> : null}
          <div className="mt-10 border-t border-white/10 pt-5 text-sm text-[#9aa4b2]">
            <a href="#meetings" className="text-[#a8c7fa] hover:underline">
              Your meetings
            </a>{' '}
            · {open.length} open{rooms.some((r) => r.recordings.length) ? ` · ${rooms.reduce((n, r) => n + r.recordings.length, 0)} recordings` : ''}
          </div>
        </section>
        <Carousel recording={status.recording} />
      </main>

      <section id="meetings" className="mx-auto max-w-[1000px] px-6 pb-20 lg:px-10">
        <div className="mb-4 flex items-center gap-1 border-b border-white/10">
          {(
            [
              ['open', `Upcoming and open (${open.length})`],
              ['ended', `Ended (${ended.length})`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn('-mb-px border-b-2 px-4 py-3 text-sm font-medium transition', tab === k ? 'border-[#a8c7fa] text-[#a8c7fa]' : 'border-transparent text-[#9aa4b2] hover:text-[#e3e8f0]')}>
              {label}
            </button>
          ))}
        </div>
        {(tab === 'open' ? open : ended).length ? (
          <ul className="space-y-3">
            {(tab === 'open' ? open : ended).map((r) => (
              <RoomCard key={r.id} room={r} teammates={teammates} />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-[#9aa4b2]">{tab === 'open' ? 'No meetings yet. Use New meeting to start one.' : 'No ended meetings.'}</p>
        )}
      </section>

      {dialog === 'later' && later ? <LaterDialog code={later.code} roomId={laterRoom?.id ?? null} teammates={teammates} onClose={() => setDialog(null)} /> : null}
      {dialog === 'schedule' ? (
        <Dialog title="Schedule a meeting" onClose={() => setDialog(null)} wide>
          <div className="rounded-xl bg-white/[0.03] p-4">
            <NewMeetForm teammates={teammates} ready={status.ready} onDone={() => setDialog(null)} />
          </div>
        </Dialog>
      ) : null}
      {dialog === 'setup' ? <SetupDialog status={status} onClose={() => setDialog(null)} /> : null}
    </div>
  )
}

function HomeItem({ icon, children, onClick }: { icon: React.ReactElement; children: React.ReactNode; onClick: () => void }): React.ReactElement {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 px-4 py-3 text-left text-[15px] transition hover:bg-white/[0.08] [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-[#c4cbd6]">
      {icon}
      {children}
    </button>
  )
}

function Dialog({ title, children, onClose, wide = false }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn('meet-pop max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-[#1a2333] p-6 text-[#e3e8f0] shadow-2xl ring-1 ring-white/10', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-[22px]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-[#c4cbd6] hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** "Here's your meeting": the link to share with teammates, and personal invites for anyone else. */
function LaterDialog({ code, roomId, teammates, onClose }: { code: string; roomId: string | null; teammates: Teammate[]; onClose: () => void }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [emails, setEmails] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()
  const link = typeof window !== 'undefined' ? `${window.location.origin}/meet/${code}` : `/meet/${code}`
  return (
    <Dialog title="Here’s your meeting" onClose={onClose}>
      <p className="text-sm text-[#9aa4b2]">Save this link to use later. It works for Igani admins and anyone you add below.</p>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/[0.06] py-2 pl-4 pr-2">
        <span className="min-w-0 flex-1 truncate text-[15px]">{link.replace(/^https?:\/\//, '')}</span>
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard?.writeText(link).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1600)
            })
          }
          aria-label="Copy meeting link"
          className="rounded-full p-2.5 text-[#c4cbd6] transition hover:bg-white/10"
        >
          {copied ? <Check className="h-5 w-5 text-emerald-300" /> : <Copy className="h-5 w-5" />}
        </button>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-lg bg-[#a8c7fa]/10 p-3 text-xs text-[#c4cbd6]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#a8c7fa]" /> Guests get their own personal link by email, so only people you invite can join.
      </div>
      {roomId ? (
        <div className="mt-5 space-y-3 [&_textarea]:border-white/15 [&_textarea]:bg-transparent">
          <p className="text-sm font-medium">Add people</p>
          <Invitees teammates={teammates} picked={picked} setPicked={setPicked} emails={emails} setEmails={setEmails} />
          <button
            type="button"
            disabled={pending || (!picked.length && !emails.trim())}
            onClick={() =>
              start(async () => {
                const r = await addMeetInvites({ roomId, userIds: picked, emails })
                setMsg(r.ok ? `Invite sent to ${r.data.sent} ${r.data.sent === 1 ? 'person' : 'people'}${r.data.failed ? ` (${r.data.failed} couldn’t be emailed)` : ''}.` : r.error)
                if (r.ok) {
                  setPicked([])
                  setEmails('')
                  router.refresh()
                }
              })
            }
            className={cn(BLUE_BTN, 'h-10 px-5 text-sm')}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send invites
          </button>
          {msg ? <p className="text-sm text-[#c4cbd6]">{msg}</p> : null}
        </div>
      ) : (
        <p className="mt-5 flex items-center gap-2 text-sm text-[#9aa4b2]">
          <Loader2 className="h-4 w-4 animate-spin" /> Getting things ready…
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Link href={`/meet/${code}`} className={cn(BLUE_BTN, 'h-10 px-5 text-sm')}>
          <Video className="h-4 w-4" /> Join now
        </Link>
      </div>
    </Dialog>
  )
}

function SetupDialog({ status, onClose }: { status: MeetStatus; onClose: () => void }): React.ReactElement {
  const row = (ok: boolean, title: string, body: React.ReactNode): React.ReactElement => (
    <div className="flex gap-3 rounded-xl bg-white/[0.04] p-4">
      <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300')}>{ok ? <Check className="h-3 w-3" /> : <span className="text-xs font-bold">!</span>}</span>
      <div className="min-w-0 text-sm">
        <p className="font-medium">{title}</p>
        <div className="mt-1 text-[#9aa4b2]">{body}</div>
      </div>
    </div>
  )
  return (
    <Dialog title="Settings" onClose={onClose} wide>
      <div className="space-y-3">
        {row(
          status.configured,
          status.configured ? 'Connected to 8x8' : status.problem ? '8x8 settings need fixing' : 'Not connected to 8x8',
          status.problem ? (
            <>
              {status.problem} Change it in Vercel → Settings → Environment Variables, then redeploy.
            </>
          ) : status.configured ? (
            'Calls run on 8x8’s servers with your Igani look. One-to-one calls connect browser to browser for the lowest delay.'
          ) : (
            <ol className="list-decimal space-y-1 pl-5">
              <li>Create an account at jaas.8x8.vc and add an API key (download its private key).</li>
              <li>
                In Vercel add <code className="text-[#e3e8f0]">JAAS_APP_ID</code>, <code className="text-[#e3e8f0]">JAAS_KEY_ID</code> and <code className="text-[#e3e8f0]">JAAS_PRIVATE_KEY</code>, then redeploy.
              </li>
            </ol>
          ),
        )}
        {row(
          status.recording,
          status.recording ? 'Recording is on' : 'Recording is off',
          status.recording ? (
            'Hosts see a record button in calls. Everyone sees and hears when a call is being recorded.'
          ) : (
            <ol className="list-decimal space-y-1 pl-5">
              <li>
                In the 8x8 console open Webhooks and add <code className="break-all text-[#e3e8f0]">{status.webhookUrl}</code> with the event <span className="text-[#e3e8f0]">Recording uploaded</span>.
              </li>
              <li>
                Reveal its signing secret and add it in Vercel as <code className="text-[#e3e8f0]">JAAS_WEBHOOK_SECRET</code>, then redeploy.
              </li>
              <li>Make sure recording is switched on for your 8x8 app (billed per minute by 8x8).</li>
            </ol>
          ),
        )}
        {row(status.storage, status.storage ? 'Recordings are kept' : 'Recordings expire after 24 hours', status.storage ? 'Each recording is copied to Igani’s private storage (Cloudinary).' : 'Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Vercel so recordings are kept.')}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-[#9aa4b2]">
        <CircleDot className="h-3.5 w-3.5 text-[#f28b82]" /> Igani Meet is for admins for now. Guests join with the personal link from their invite.
      </p>
    </Dialog>
  )
}

const SLIDES = [
  { title: 'Get a link you can share', body: 'Click New meeting to get a link you can send to the people you want to meet with.' },
  { title: 'Your meeting is safe', body: 'No one can join unless the host invites them: every guest gets their own personal link.' },
  { title: 'Looks and sounds like Igani', body: 'Your logo, your colours and Igani’s own sounds, with photos of everyone in the call.' },
  { title: 'Record and replay', body: 'Hosts can record a call and watch or download it afterwards right here.' },
]

/** Google Meet's illustrated carousel, drawn with Igani's mark. */
function Carousel({ recording }: { recording: boolean }): React.ReactElement {
  const slides = recording ? SLIDES : SLIDES.slice(0, 3)
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [slides.length])
  const s = slides[i % slides.length]!
  const go = (d: number): void => setI((v) => (v + d + slides.length) % slides.length)
  return (
    <section className="hidden flex-col items-center text-center lg:flex">
      <div className="flex items-center gap-6">
        <button type="button" onClick={() => go(-1)} aria-label="Previous" className="rounded-full p-2 text-[#c4cbd6] transition hover:bg-white/10">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div key={i} className="meet-pop relative flex h-[330px] w-[330px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_40%,#1d3357,#121c2e_70%)] ring-1 ring-white/5">
          <Illustration n={i % slides.length} />
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Next" className="rounded-full p-2 text-[#c4cbd6] transition hover:bg-white/10">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <h2 className="mt-8 text-2xl">{s.title}</h2>
      <p className="mt-2 max-w-[330px] text-sm text-[#9aa4b2]">{s.body}</p>
      <div className="mt-5 flex gap-2">
        {slides.map((_, k) => (
          <button key={k} type="button" onClick={() => setI(k)} aria-label={`Slide ${k + 1}`} className={cn('h-1.5 rounded-full transition-all', k === i % slides.length ? 'w-5 bg-[#a8c7fa]' : 'w-1.5 bg-white/25')} />
        ))}
      </div>
    </section>
  )
}

function Illustration({ n }: { n: number }): React.ReactElement {
  const chip = 'absolute flex items-center gap-2 rounded-full bg-[#232d3f] px-3 py-2 text-xs shadow-xl ring-1 ring-white/10'
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
      <img src="/meet/igani-meet-mark.png" alt="" className="h-28 w-auto drop-shadow-2xl" />
      {n === 0 ? (
        <span className={cn(chip, 'bottom-16 left-6')}>
          <Link2 className="h-4 w-4 text-[#a8c7fa]" /> app.igani.co/meet/igani-…
        </span>
      ) : n === 1 ? (
        <span className={cn(chip, 'bottom-14 right-4')}>
          <ShieldCheck className="h-4 w-4 text-emerald-300" /> Invited guests only
        </span>
      ) : n === 2 ? (
        <span className="absolute bottom-14 flex -space-x-2.5">
          {['from-[#6aa6ff] to-[#2f5fd0]', 'from-[#3fd2c7] to-[#1f8a9c]', 'from-[#8b7bff] to-[#4b3fc4]'].map((g, k) => (
            <span key={g} className="rounded-full bg-gradient-to-br from-[#6aa6ff] to-[#2f5fd0] p-[2px]">
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold ring-2 ring-[#121c2e]', g)}>{['GL', 'DA', 'MR'][k]}</span>
            </span>
          ))}
        </span>
      ) : (
        <span className={cn(chip, 'left-8 top-16')}>
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ea4335]" /> Recording · 12:04
        </span>
      )}
    </>
  )
}
