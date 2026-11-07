'use client'

import { Bell, BellOff, CalendarClock, Check, ChevronDown, CircleDot, Hand, LayoutGrid, Loader2, LogOut, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, RotateCcw, Settings2, Sparkles, Video, VideoOff, Volume2, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { joinMeet } from '@/app/actions/meet'
import type { MeetConfig } from '@/lib/meet'
import { cn } from '@/lib/utils'
import { playCue, setSoundOutput, setSoundsMuted, unlockSounds } from './sounds'

/* The parts of Jitsi's iframe API we use (https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe). */
interface DeviceInfo {
  deviceId: string
  label: string
}
interface DeviceLists {
  audioInput: DeviceInfo[]
  audioOutput: DeviceInfo[]
  videoInput: DeviceInfo[]
}
interface JitsiApi {
  executeCommand(name: string, ...args: unknown[]): void
  addListener(event: string, fn: (e: never) => void): void
  getParticipantsInfo?(): { participantId: string; displayName?: string; formattedDisplayName?: string; avatarURL?: string }[]
  getAvailableDevices(): Promise<DeviceLists>
  getCurrentDevices(): Promise<{ audioInput?: DeviceInfo; audioOutput?: DeviceInfo; videoInput?: DeviceInfo }>
  setAudioInputDevice(label: string, id: string): void
  setAudioOutputDevice(label: string, id: string): void
  setVideoInputDevice(label: string, id: string): void
  dispose(): void
}
type JitsiCtor = new (domain: string, opts: Record<string, unknown>) => JitsiApi
declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiCtor
  }
}

const scripts = new Map<string, Promise<JitsiCtor>>()
function loadScript(src: string): Promise<JitsiCtor> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI)
  const known = scripts.get(src)
  if (known) return known
  const p = new Promise<JitsiCtor>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => (window.JitsiMeetExternalAPI ? resolve(window.JitsiMeetExternalAPI) : reject(new Error('The video service did not load.')))
    s.onerror = () => {
      scripts.delete(src)
      s.remove()
      reject(new Error('Could not reach the video service. Check your connection and try again.'))
    }
    document.head.appendChild(s)
  })
  scripts.set(src, p)
  return p
}

const BG = '#060a14'
const GRAD = 'bg-gradient-to-br from-[#6aa6ff] to-[#2f5fd0]'

/* Remembered between calls on this device: name (guests), mic/camera on or off, and chosen devices. */
interface Prefs {
  name?: string
  mic?: boolean
  cam?: boolean
  micId?: string
  camId?: string
  spkId?: string
  blur?: Blur
  sounds?: boolean
}
const PREFS = 'igani-meet-prefs'
function readPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS) ?? '{}') as Prefs
  } catch {
    return {}
  }
}
function writePrefs(p: Prefs): void {
  try {
    localStorage.setItem(PREFS, JSON.stringify({ ...readPrefs(), ...p }))
  } catch {
    /* private mode: nothing to remember */
  }
}

interface Picked {
  mic: boolean
  cam: boolean
  micId: string
  camId: string
  spkId: string
  blur: Blur
  devices: DeviceLists
}
const labelOf = (list: DeviceInfo[], id: string): string | undefined => list.find((d) => d.deviceId === id)?.label || undefined

/** Jitsi with its own interface switched off: Igani draws the header, controls and screens. */
function jitsiOptions(cfg: MeetConfig, node: HTMLElement, me: { name: string; email: string | null }, start: Picked, title: string, canRecord: boolean): Record<string, unknown> {
  const devices = { audioInput: labelOf(start.devices.audioInput, start.micId), videoInput: labelOf(start.devices.videoInput, start.camId), audioOutput: labelOf(start.devices.audioOutput, start.spkId) }
  return {
    roomName: cfg.roomName,
    jwt: cfg.jwt ?? undefined,
    parentNode: node,
    width: '100%',
    height: '100%',
    userInfo: { displayName: me.name, email: me.email ?? undefined },
    ...(devices.audioInput || devices.videoInput || devices.audioOutput ? { devices } : {}),
    configOverwrite: {
      subject: title,
      prejoinConfig: { enabled: false },
      prejoinPageEnabled: false,
      startWithAudioMuted: !start.mic,
      startWithVideoMuted: !start.cam,
      toolbarButtons: [],
      disableDeepLinking: true,
      hideConferenceSubject: true,
      hideConferenceTimer: true,
      hideRecordingLabel: true,
      conferenceInfo: { alwaysVisible: [], autoHide: [] },
      disableInviteFunctions: true,
      disableProfile: true,
      readOnlyName: true,
      disableReactions: true,
      disablePolls: true,
      disableSelfViewSettings: true,
      giphy: { enabled: false },
      notifications: [],
      // Igani plays its own join / leave / message sounds (components/meet/sounds.ts)
      disableJoinLeaveSounds: true,
      disabledSounds: ['PARTICIPANT_JOINED_SOUND', 'PARTICIPANT_LEFT_SOUND', 'INCOMING_MSG_SOUND', 'KNOCKING_PARTICIPANT_SOUND', 'REACTION_SOUND'],
      welcomePage: { disabled: true },
      enableClosePage: false,
      disableThirdPartyRequests: true,
      analytics: { disabled: true },
      securityUi: { hideLobbyButton: true },
      breakoutRooms: { hideAddRoomButton: true, hideJoinRoomButton: true },
      fileRecordingsEnabled: canRecord,
      recordingService: { enabled: canRecord, sharingEnabled: false },
      localRecording: { disable: true },
      liveStreamingEnabled: false,
      defaultLanguage: 'en',
      p2p: { enabled: true },
      enableNoisyMicDetection: true,
      enableNoAudioDetection: true,
      resolution: 720,
      constraints: { video: { height: { ideal: 720, max: 1080, min: 240 } } },
    },
    interfaceConfigOverwrite: {
      SHOW_JITSI_WATERMARK: false,
      SHOW_WATERMARK_FOR_GUESTS: false,
      SHOW_BRAND_WATERMARK: false,
      SHOW_POWERED_BY: false,
      MOBILE_APP_PROMO: false,
      HIDE_INVITE_MORE_HEADER: true,
      DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
      DEFAULT_BACKGROUND: BG,
      TOOLBAR_BUTTONS: [],
      VIDEO_LAYOUT_FIT: 'both',
      FILM_STRIP_MAX_HEIGHT: 110,
    },
  }
}

const clock = (sec: number): string => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

/** A key press that isn't someone typing in a field. */
const isTyping = (e: KeyboardEvent): boolean => {
  const t = e.target as HTMLElement | null
  return Boolean(t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)))
}

export interface IganiMeetProps {
  code: string
  token: string | null
  title: string
  hostName: string | null
  defaultName: string
  email: string | null
  /** guests type their own name; teammates use their CRM name */
  nameEditable: boolean
  isHost: boolean
  /** the video service's script, loaded while people are still on the "ready to join" screen */
  scriptUrl: string | null
  /** my photo (teammates), the host's photo, and when the call is planned */
  avatar: string | null
  hostAvatar: string | null
  startsAt: string | null
  durationMin: number
}

type Phase = 'prejoin' | 'joining' | 'live' | 'left' | 'ended' | 'error'
const NO_DEVICES: DeviceLists = { audioInput: [], audioOutput: [], videoInput: [] }

export function IganiMeet(p: IganiMeetProps): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('prejoin')
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(p.defaultName)
  const [picked, setPicked] = useState<Picked>({ mic: true, cam: true, micId: '', camId: '', spkId: '', blur: 'none', devices: NO_DEVICES })
  const [session, setSession] = useState<{ api: JitsiApi; testServer: boolean; moderator: boolean; canRecord: boolean; name: string; avatar: string | null } | null>(null)
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const api = useRef<JitsiApi | null>(null)

  // what this device used last time; the video service starts loading while people get ready
  useEffect(() => {
    const prefs = readPrefs()
    queueMicrotask(() => {
      setPicked((v) => ({ ...v, mic: prefs.mic ?? true, cam: prefs.cam ?? true, micId: prefs.micId ?? '', camId: prefs.camId ?? '', spkId: prefs.spkId ?? '', blur: prefs.blur ?? 'none' }))
      setSoundsMuted(prefs.sounds === false)
      if (p.nameEditable && !p.defaultName && prefs.name) setName(prefs.name)
    })
    if (p.scriptUrl) void loadScript(p.scriptUrl).catch(() => undefined)
  }, [p.nameEditable, p.defaultName, p.scriptUrl])

  const stop = useCallback(() => {
    api.current?.dispose()
    api.current = null
    setSession(null)
  }, [])

  const join = useCallback(async () => {
    setPhase('joining')
    setError(null)
    unlockSounds()
    if (picked.spkId) setSoundOutput(picked.spkId)
    const display = name.trim() || p.defaultName
    writePrefs({ mic: picked.mic, cam: picked.cam, micId: picked.micId, camId: picked.camId, spkId: picked.spkId, blur: picked.blur, ...(p.nameEditable ? { name: display } : {}) })
    const res = await joinMeet({ code: p.code, token: p.token, name: display })
    if (!res.ok) {
      setError(res.error)
      setPhase('error')
      return
    }
    try {
      const Ctor = await loadScript(res.data.config.scriptUrl)
      if (!stage.current) return
      api.current?.dispose()
      api.current = new Ctor(res.data.config.domain, jitsiOptions(res.data.config, stage.current, { name: res.data.name, email: p.email }, picked, p.title, res.data.canRecord))
      setSession({ api: api.current, testServer: res.data.config.testServer, moderator: res.data.moderator, canRecord: res.data.canRecord, name: res.data.name, avatar: res.data.avatar })
      setPhase('live')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the call.')
      setPhase('error')
    }
  }, [p.code, p.token, p.defaultName, p.email, p.title, p.nameEditable, name, picked])

  useEffect(() => () => api.current?.dispose(), [])

  return (
    <div className="dark fixed inset-0 flex flex-col overflow-hidden text-white" style={{ background: BG }}>
      <Glow />
      {phase === 'prejoin' || phase === 'joining' ? <PreJoin {...p} name={name} setName={setName} picked={picked} setPicked={setPicked} joining={phase === 'joining'} onJoin={join} /> : null}
      {phase === 'error' ? <Notice title="We couldn’t connect you" body={error ?? 'Something went wrong.'} action={{ label: 'Try again', onClick: () => setPhase('prejoin') }} /> : null}
      {phase === 'left' ? <Notice title="You left the call" body={`Thanks for joining ${p.title}.`} action={{ label: 'Rejoin', onClick: () => setPhase('prejoin') }} /> : null}
      {phase === 'ended' ? <Notice title="The call has ended" body={`${p.title} is over. Thanks for joining.`} action={{ label: 'Rejoin', onClick: () => setPhase('prejoin') }} /> : null}
      {/* the call itself stays mounted while live */}
      <div className={cn('relative flex min-h-0 flex-1 flex-col', phase !== 'live' && 'hidden')}>
        {phase === 'live' && session ? (
          <Live
            api={session.api}
            slot={slot}
            title={p.title}
            testServer={session.testServer}
            moderator={session.moderator}
            canRecord={session.canRecord}
            startMic={picked.mic}
            startCam={picked.cam}
            blur={picked.blur}
            me={{ name: session.name, avatar: session.avatar }}
            presence={{ code: p.code, token: p.token }}
            onLeft={(why) => {
              stop()
              setPhase(why === 'me' ? 'left' : 'ended')
            }}
            onFail={(why) => {
              stop()
              setError(why)
              setPhase('error')
            }}
          />
        ) : null}
        <div className="relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden rounded-2xl bg-[#0a1020] ring-1 ring-white/10 sm:mx-4">
          <div ref={stage} className="absolute inset-0" />
          <div ref={setSlot} className="pointer-events-none absolute inset-0" />
        </div>
      </div>
    </div>
  )
}

function Glow(): React.ReactElement {
  return <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,120,219,0.18),transparent_70%)]" />
}

function Brand({ small = false }: { small?: boolean }): React.ReactElement {
  return (
    <span className="flex items-center gap-2">
      <Image src="/igani-logo.png" alt="Igani" width={small ? 57 : 71} height={small ? 24 : 30} priority style={{ height: small ? 24 : 30, width: 'auto' }} />
      <span className={cn('rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wider text-white shadow-lg shadow-[#3b78db]/30', GRAD, small ? 'text-[10px]' : 'text-[11px]')}>Meet</span>
    </span>
  )
}

function DeviceSelect({ icon, label, list, value, onChange }: { icon: React.ReactElement; label: string; list: DeviceInfo[]; value: string; onChange: (id: string) => void }): React.ReactElement | null {
  if (!list.length) return null
  const current = list.some((d) => d.deviceId === value) ? value : (list[0]?.deviceId ?? '')
  return (
    <label className="relative flex h-10 min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 pl-3 pr-8 text-sm text-white/80 transition focus-within:border-[#6aa6ff]/60 hover:bg-white/[0.07] [&>svg:first-child]:h-4 [&>svg:first-child]:w-4 [&>svg:first-child]:shrink-0 [&>svg:first-child]:text-white/50">
      {icon}
      <span className="sr-only">{label}</span>
      <select value={current} onChange={(e) => onChange(e.target.value)} className="min-w-0 flex-1 cursor-pointer appearance-none truncate bg-transparent outline-none [&>option]:bg-[#0c1322]">
        {list.map((d, i) => (
          <option key={d.deviceId || i} value={d.deviceId}>
            {d.label || `${label} ${i + 1}`}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-white/40" />
    </label>
  )
}

async function listDevices(): Promise<DeviceLists> {
  const all = await navigator.mediaDevices.enumerateDevices()
  const pick = (kind: MediaDeviceKind): DeviceInfo[] => all.filter((d) => d.kind === kind && d.deviceId && d.deviceId !== 'communications').map((d) => ({ deviceId: d.deviceId, label: d.label }))
  return { audioInput: pick('audioinput'), audioOutput: pick('audiooutput'), videoInput: pick('videoinput') }
}

/* ── People rings: overlapping photos with a brand ring, the speaker's ring lit, "+N" for the rest ── */

export interface Person {
  id: string
  name: string
  avatar: string | null
  you?: boolean
  speaking?: boolean
}

const HUES = ['from-[#6aa6ff] to-[#2f5fd0]', 'from-[#8b7bff] to-[#4b3fc4]', 'from-[#3fd2c7] to-[#1f8a9c]', 'from-[#ff9f6a] to-[#d0512f]', 'from-[#f07ab8] to-[#b0336f]']
const hueOf = (name: string): string => HUES[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % HUES.length]!
const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '?'

export function Avatar({ name, src, className }: { name: string; src: string | null; className?: string }): React.ReactElement {
  const [broken, setBroken] = useState<string | null>(null)
  const show = src && broken !== src
  return (
    <span className={cn('flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white', hueOf(name), className)}>
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element -- small remote/proxied photos, sized by CSS
        <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(src)} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  )
}

export function PeopleRings({ people, max = 4, size = 'md', onClick }: { people: Person[]; max?: number; size?: 'sm' | 'md'; onClick?: () => void }): React.ReactElement | null {
  if (!people.length) return null
  const shown = people.slice(0, max)
  const extra = people.length - shown.length
  const dim = size === 'sm' ? 'h-8 w-8 text-[11px]' : 'h-10 w-10 text-xs'
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className="flex items-center -space-x-2.5" aria-label={`In the call: ${people.map((x) => (x.you ? 'you' : x.name)).join(', ')}`}>
      {shown.map((x, i) => (
        <span key={x.id} className="group relative transition-transform duration-200 hover:z-50 hover:-translate-y-1" style={{ zIndex: shown.length - i }}>
          <span className={cn('block rounded-full p-[2px] transition-shadow duration-300', x.speaking ? 'bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-[0_0_0_4px_rgba(52,211,153,0.22)]' : 'bg-gradient-to-br from-[#6aa6ff] to-[#2f5fd0]')}>
            <span className="block rounded-full ring-2 ring-[#060a14]">
              <Avatar name={x.name} src={x.avatar} className={dim} />
            </span>
          </span>
          <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/85 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg ring-1 ring-white/10 transition group-hover:opacity-100">
            {x.you ? `${x.name} (you)` : x.name}
          </span>
        </span>
      ))}
      {extra > 0 ? (
        <span className="relative rounded-full bg-white/10 p-[2px]" style={{ zIndex: 0 }}>
          <span className={cn('flex items-center justify-center rounded-full bg-[#111a2e] font-semibold text-white/80 ring-2 ring-[#060a14]', dim)}>+{extra}</span>
        </span>
      ) : null}
    </Tag>
  )
}

/** Who's in the call right now, for the lobby (asks every few seconds while it's open). */
function usePresence(code: string, token: string | null, enabled: boolean): { name: string; avatar: string | null }[] | null {
  const [people, setPeople] = useState<{ name: string; avatar: string | null }[] | null>(null)
  useEffect(() => {
    if (!enabled) return
    let live = true
    const load = (): void => {
      void fetch(`/api/public/meet/${encodeURIComponent(code)}/presence${token ? `?t=${encodeURIComponent(token)}` : ''}`, { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<{ people: { name: string; avatar: string | null }[] }>) : null))
        .then((d) => {
          if (live && d) setPeople(d.people)
        })
        .catch(() => undefined)
    }
    load()
    const t = setInterval(load, 5000)
    return () => {
      live = false
      clearInterval(t)
    }
  }, [code, token, enabled])
  return people
}

const listNames = (names: string[]): string => (names.length <= 1 ? (names[0] ?? '') : names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`)

/** "Today, 3:00 PM · 30 min" and how far away it is. */
function useSchedule(startsAt: string | null, durationMin: number): { when: string; rel: string; soon: boolean } | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (!startsAt) return
    const tick = (): void => setNow(Date.now())
    queueMicrotask(tick)
    const t = setInterval(tick, 30_000)
    return () => clearInterval(t)
  }, [startsAt])
  if (!startsAt || now == null) return null
  const start = new Date(startsAt)
  const day = new Date(start).setHours(0, 0, 0, 0)
  const today = new Date(now).setHours(0, 0, 0, 0)
  const dayLabel = day === today ? 'Today' : day === today + 86_400_000 ? 'Tomorrow' : start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const when = `${dayLabel}, ${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · ${durationMin} min`
  const mins = Math.round((start.getTime() - now) / 60_000)
  const rel = mins > 90 ? '' : mins > 1 ? `Starts in ${mins} min` : mins >= -1 ? 'Starting now' : -mins <= durationMin ? `Started ${-mins} min ago` : ''
  return { when, rel, soon: mins <= 10 && -mins <= durationMin }
}

/** A Meet-style control: the round on/off button with its device picker attached. */
function DevicePill({ on, onToggle, icon, offIcon, label, list, value, onPick, buttonRef, toggleLabel }: { on: boolean; onToggle: () => void; icon: React.ReactElement; offIcon: React.ReactElement; label: string; list: DeviceInfo[]; value: string; onPick: (id: string) => void; buttonRef?: React.Ref<HTMLButtonElement>; toggleLabel: string }): React.ReactElement {
  const current = list.find((d) => d.deviceId === value) ?? list[0]
  return (
    <div className={cn('flex h-12 items-center rounded-full ring-1 backdrop-blur-md transition', on ? 'bg-white/10 ring-white/15' : 'bg-rose-500/20 ring-rose-300/30')}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-label={toggleLabel}
        title={toggleLabel}
        className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow] duration-100 active:scale-95 [&_svg]:h-5 [&_svg]:w-5', on ? 'hover:bg-white/10' : 'bg-rose-500 hover:bg-rose-400')}
      >
        {on ? icon : offIcon}
      </button>
      {list.length ? (
        <label className="relative flex h-12 cursor-pointer items-center gap-1 pl-1 pr-3 text-xs text-white/75 hover:text-white" title={`${label}: ${current?.label || 'default'}`}>
          <span className="hidden max-w-[120px] truncate sm:inline">{current?.label?.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)$/i, '') || label}</span>
          <ChevronDown className="h-4 w-4" />
          <select value={current?.deviceId ?? ''} onChange={(e) => onPick(e.target.value)} aria-label={`Choose ${label.toLowerCase()}`} className="absolute inset-0 cursor-pointer opacity-0">
            {list.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `${label} ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  )
}

function PreJoin(p: IganiMeetProps & { name: string; setName: (v: string) => void; picked: Picked; setPicked: React.Dispatch<React.SetStateAction<Picked>>; joining: boolean; onJoin: () => void }): React.ReactElement {
  const video = useRef<HTMLVideoElement>(null)
  const micButton = useRef<HTMLButtonElement>(null)
  const [perm, setPerm] = useState<'asking' | 'ok' | 'denied' | 'none'>('asking')
  const [testing, setTesting] = useState(false)
  const { picked, setPicked, joining, onJoin, name } = p
  const { mic, cam, micId, camId } = picked
  const [canPickSpeaker] = useState(() => typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype)
  const inCall = usePresence(p.code, p.token, !joining)
  const schedule = useSchedule(p.startsAt, p.durationMin)

  // camera preview and a live microphone level (the mic button glows as you talk); released before joining
  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    let raf = 0
    let ctx: AudioContext | null = null
    const btn = micButton.current
    if (joining || (!cam && !mic)) return
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setPerm('none'))
      return
    }
    navigator.mediaDevices
      .getUserMedia({
        video: cam ? { width: { ideal: 1280 }, height: { ideal: 720 }, ...(camId ? { deviceId: { ideal: camId } } : {}) } : false,
        audio: mic ? { echoCancellation: true, noiseSuppression: true, ...(micId ? { deviceId: { ideal: micId } } : {}) } : false,
      })
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) video.current.srcObject = s
        setPerm('ok')
        const devices = await listDevices().catch(() => NO_DEVICES)
        if (cancelled) return
        setPicked((v) => ({ ...v, devices }))
        if (s.getAudioTracks().length && typeof AudioContext !== 'undefined') {
          ctx = new AudioContext()
          const an = ctx.createAnalyser()
          an.fftSize = 512
          ctx.createMediaStreamSource(s).connect(an)
          const buf = new Uint8Array(an.fftSize)
          let level = 0
          const tick = (): void => {
            an.getByteTimeDomainData(buf)
            let peak = 0
            for (const v of buf) peak = Math.max(peak, Math.abs(v - 128))
            level = Math.max(Math.min(1, (peak / 128) * 2.4), level * 0.86)
            if (btn) btn.style.boxShadow = level > 0.04 ? `0 0 0 ${2 + level * 7}px rgba(52,211,153,${0.18 + level * 0.45})` : ''
            raf = requestAnimationFrame(tick)
          }
          tick()
        }
      })
      .catch((e: unknown) => setPerm(e instanceof DOMException && e.name === 'NotAllowedError' ? 'denied' : 'none'))
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      void ctx?.close()
      stream?.getTracks().forEach((t) => t.stop())
      if (btn) btn.style.boxShadow = ''
    }
  }, [cam, mic, camId, micId, joining, setPicked])

  // Enter joins
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' && !joining && name.trim() && !(e.target instanceof HTMLSelectElement) && !(e.target instanceof HTMLButtonElement)) onJoin()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onJoin, joining, name])

  const set = (v: Partial<Picked>): void => setPicked((x) => ({ ...x, ...v }))
  const testSpeaker = (): void => {
    unlockSounds()
    if (picked.spkId) setSoundOutput(picked.spkId)
    setSoundsMuted(false)
    playCue('test')
    setTesting(true)
    setTimeout(() => setTesting(false), 1400)
  }
  const showVideo = cam && perm === 'ok'
  const here = (inCall ?? []).map((x, i) => ({ id: `${i}-${x.name}`, name: x.name, avatar: x.avatar }))
  const first = inCall != null && here.length === 0
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Brand />
        {here.length ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/60 sm:inline">In the call</span>
            <PeopleRings people={here} />
          </div>
        ) : null}
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-6 px-4 pb-8 sm:px-8 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
        <div className="min-w-0">
          <div className="relative aspect-video w-full overflow-hidden rounded-[28px] bg-[#0c1322] shadow-2xl shadow-black/50 ring-1 ring-white/10">
            <video ref={video} autoPlay playsInline muted className={cn('h-full w-full -scale-x-100 object-cover transition-opacity duration-500', showVideo ? 'opacity-100' : 'opacity-0')} />
            {!showVideo ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_40%,rgba(59,120,219,0.16),transparent_60%)] text-center">
                <span className="rounded-full bg-gradient-to-br from-[#6aa6ff] to-[#2f5fd0] p-[3px] shadow-2xl shadow-[#3b78db]/30">
                  <span className="block rounded-full ring-4 ring-[#0c1322]">
                    <Avatar name={p.name || '?'} src={p.avatar} className="h-24 w-24 text-3xl" />
                  </span>
                </span>
                <p className="max-w-xs px-4 text-sm text-white/60">{!cam ? 'Your camera is off' : perm === 'asking' ? 'Starting your camera…' : perm === 'denied' ? 'Camera and microphone are blocked. Click the camera icon in your browser’s address bar to allow them, or join with them off.' : 'No camera found. You can still join with sound.'}</p>
              </div>
            ) : null}
            <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/10 backdrop-blur-md">{p.name.trim() || 'You'}</span>
            {picked.blur !== 'none' ? (
              <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white/80 ring-1 ring-white/10 backdrop-blur-md">
                <Sparkles className="h-3 w-3" /> Blur on when you join
              </span>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-10 sm:gap-3">
              <DevicePill on={mic} onToggle={() => set({ mic: !mic })} icon={<Mic />} offIcon={<MicOff />} toggleLabel={mic ? 'Mute microphone' : 'Unmute microphone'} label="Microphone" list={picked.devices.audioInput} value={micId} onPick={(id) => set({ micId: id })} buttonRef={micButton} />
              <DevicePill on={cam} onToggle={() => set({ cam: !cam })} icon={<Video />} offIcon={<VideoOff />} toggleLabel={cam ? 'Turn camera off' : 'Turn camera on'} label="Camera" list={picked.devices.videoInput} value={camId} onPick={(id) => set({ camId: id })} />
              <button
                type="button"
                onClick={() => set({ blur: picked.blur === 'none' ? 'blur' : 'none' })}
                aria-pressed={picked.blur !== 'none'}
                title={picked.blur === 'none' ? 'Blur my background' : 'Don’t blur my background'}
                aria-label="Blur my background"
                className={cn('flex h-12 w-12 items-center justify-center rounded-full ring-1 backdrop-blur-md transition active:scale-95 [&_svg]:h-5 [&_svg]:w-5', picked.blur !== 'none' ? 'bg-[#3b78db] ring-[#6aa6ff]/50' : 'bg-white/10 ring-white/15 hover:bg-white/15')}
              >
                <Sparkles />
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/50">
            <Check2 ok={perm === 'ok' && mic} label={mic ? (perm === 'ok' ? 'Microphone works' : 'Microphone') : 'Microphone off'} />
            <Check2 ok={perm === 'ok' && cam} label={cam ? (perm === 'ok' ? 'Camera works' : 'Camera') : 'Camera off'} />
            <span className="flex items-center gap-1.5">
              <button type="button" onClick={testSpeaker} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-white/70 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white">
                <Volume2 className={cn('h-3.5 w-3.5', testing && 'animate-pulse text-emerald-300')} /> {testing ? 'Playing…' : 'Test speaker'}
              </button>
              {canPickSpeaker && picked.devices.audioOutput.length > 1 ? (
                <select value={picked.spkId || picked.devices.audioOutput[0]?.deviceId} onChange={(e) => set({ spkId: e.target.value })} aria-label="Choose speaker" className="max-w-[160px] cursor-pointer truncate rounded-full bg-transparent px-2 py-1 text-white/70 outline-none ring-1 ring-white/10 hover:bg-white/10 [&>option]:bg-[#0c1322]">
                  {picked.devices.audioOutput.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Speaker ${i + 1}`}
                    </option>
                  ))}
                </select>
              ) : null}
            </span>
          </div>
        </div>

        <div className="rounded-[28px] bg-white/[0.035] p-6 shadow-2xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-xl sm:p-8">
          <div className="flex items-center gap-2.5">
            {p.hostName ? <Avatar name={p.hostName} src={p.hostAvatar} className="h-7 w-7 text-[10px] ring-2 ring-[#6aa6ff]/40" /> : null}
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7fb0ff]">{p.hostName ? `${p.hostName} invited you` : p.isHost ? 'You’re the host' : 'Ready to join?'}</p>
          </div>
          <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight sm:text-3xl">{p.title}</h1>
          {schedule ? (
            <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/70">
              <CalendarClock className="h-4 w-4 text-white/50" /> {schedule.when}
              {schedule.rel ? <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', schedule.soon ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30' : 'bg-white/5 text-white/70 ring-white/10')}>{schedule.rel}</span> : null}
            </p>
          ) : null}

          <div className="mt-5 flex min-h-[52px] items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/[0.07]">
            {inCall == null ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white/40" />
                <span className="text-sm text-white/50">Checking who’s here…</span>
              </>
            ) : here.length ? (
              <>
                <PeopleRings people={here} max={3} size="sm" />
                <span className="text-sm text-white/80">
                  <span className="font-medium text-white">{listNames(here.map((x) => x.name.split(' ')[0]!))}</span> {here.length === 1 ? 'is' : 'are'} in the call
                </span>
                <span className="relative ml-auto flex h-2.5 w-2.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
              </>
            ) : (
              <span className="text-sm text-white/60">No one’s here yet. You’ll be the first.</span>
            )}
          </div>

          <label className="mt-5 block">
            <span className="text-xs text-white/60">Your name</span>
            <input
              value={p.name}
              onChange={(e) => p.setName(e.target.value)}
              readOnly={!p.nameEditable}
              maxLength={60}
              placeholder="Type your name"
              className={cn('mt-1.5 h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-[15px] outline-none transition placeholder:text-white/30 focus:border-[#6aa6ff]/60 focus:ring-2 focus:ring-[#6aa6ff]/30', !p.nameEditable && 'text-white/70')}
            />
          </label>
          <button
            type="button"
            disabled={joining || !p.name.trim()}
            onClick={onJoin}
            className={cn('group mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold shadow-lg shadow-[#3b78db]/35 transition hover:shadow-[#3b78db]/55 hover:brightness-110 active:scale-[0.99] disabled:opacity-60', GRAD)}
          >
            {joining ? <Loader2 className="h-5 w-5 animate-spin" /> : <Video className="h-5 w-5 transition group-hover:scale-110" />}
            {joining ? 'Joining…' : first && (p.isHost || !p.hostName) ? 'Start the call' : 'Join now'}
          </button>
          <p className="mt-4 text-center text-xs leading-relaxed text-white/40">
            Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">Enter</kbd> to join. In the call, <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">M</kbd> mutes and <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-sans">V</kbd> turns video on or off.
          </p>
        </div>
      </main>
    </div>
  )
}

function Check2({ ok, label }: { ok: boolean; label: string }): React.ReactElement {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full', ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/40')}>{ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}</span>
      {label}
    </span>
  )
}

function RoundButton({ on, onClick, label, icon, danger = false, active = false, badge, className, disabled }: { on: boolean; onClick: () => void; label: string; icon: React.ReactElement; danger?: boolean; active?: boolean; badge?: number; className?: string; disabled?: boolean }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      aria-pressed={active || undefined}
      className={cn(
        'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full ring-1 transition active:scale-95 disabled:opacity-60 [&_svg]:h-5 [&_svg]:w-5',
        danger ? 'w-16 bg-rose-600 ring-rose-400/40 hover:bg-rose-500' : !on ? 'bg-rose-500/90 ring-rose-300/30 hover:bg-rose-500' : active ? 'bg-[#3b78db] ring-[#6aa6ff]/50' : 'bg-white/10 ring-white/15 hover:bg-white/15',
        className,
      )}
    >
      {icon}
      {badge ? <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6aa6ff] px-1 text-[10px] font-bold text-[#060a14]">{badge}</span> : null}
    </button>
  )
}

interface Toast {
  id: number
  text: string
  tone: 'info' | 'rec' | 'warn'
}

function Live({ api, slot, title, testServer, moderator, canRecord, startMic, startCam, blur, me, presence, onLeft, onFail }: { api: JitsiApi; slot: HTMLDivElement | null; title: string; testServer: boolean; moderator: boolean; canRecord: boolean; startMic: boolean; startCam: boolean; blur: Blur; me: { name: string; avatar: string | null }; presence: { code: string; token: string | null }; onLeft: (why: 'me' | 'ended') => void; onFail: (why: string) => void }): React.ReactElement {
  const [mic, setMic] = useState(startMic)
  const [cam, setCam] = useState(startCam)
  const [sharing, setSharing] = useState(false)
  const [tile, setTile] = useState(false)
  const [hand, setHand] = useState(false)
  const [chat, setChat] = useState({ open: false, unread: 0 })
  const [people, setPeople] = useState<Record<string, { name: string; avatar: string | null }>>({})
  const [myId, setMyId] = useState<string | null>(null)
  const [speaker, setSpeaker] = useState<string | null>(null)
  const [joinedAt, setJoinedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [rec, setRec] = useState<{ on: boolean; since: number | null; pending: boolean }>({ on: false, since: null, pending: false })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [panel, setPanel] = useState<'settings' | 'leave' | null>(null)
  const leftRef = useRef(onLeft)
  const failRef = useRef(onFail)
  const joinedRef = useRef(false)
  const recOn = useRef(false)
  const iLeft = useRef(false)
  const recPending = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastId = useRef(0)
  useEffect(() => {
    leftRef.current = onLeft
    failRef.current = onFail
  }, [onLeft, onFail])

  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastId.current
    setToasts((t) => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  useEffect(() => {
    const names = new Map<string, { name: string; avatar: string | null }>()
    let selfId: string | null = null
    const sync = (): void => setPeople(Object.fromEntries(names))
    // Jitsi knows everyone's photo (from their pass); read it again shortly after someone arrives
    const refresh = (): void => {
      for (const x of api.getParticipantsInfo?.() ?? []) {
        if (!x.participantId || x.participantId === selfId || !names.has(x.participantId)) continue
        const was = names.get(x.participantId)!
        names.set(x.participantId, { name: x.displayName || x.formattedDisplayName || was.name, avatar: x.avatarURL || was.avatar })
      }
      sync()
    }
    api.addListener('videoConferenceJoined', (e: { id?: string }) => {
      joinedRef.current = true
      selfId = e.id ?? null
      setMyId(selfId)
      setJoinedAt(Date.now())
      playCue('ready')
      if (me.avatar) api.executeCommand('avatarUrl', me.avatar)
      if (blur !== 'none') api.executeCommand('setBlurredBackground', blur)
      for (const x of api.getParticipantsInfo?.() ?? []) if (x.participantId && x.participantId !== selfId) names.set(x.participantId, { name: x.displayName || x.formattedDisplayName || 'Guest', avatar: x.avatarURL || null })
      sync()
    })
    api.addListener('participantJoined', (e: { id: string; displayName?: string }) => {
      if (e.id === selfId) return
      names.set(e.id, { name: e.displayName || 'Guest', avatar: null })
      sync()
      setTimeout(refresh, 800)
      setTimeout(refresh, 3000)
      if (joinedRef.current) {
        playCue('join')
        toast(`${e.displayName || 'Someone'} joined`)
      }
    })
    api.addListener('participantLeft', (e: { id: string }) => {
      const was = names.get(e.id)
      names.delete(e.id)
      sync()
      if (was) {
        playCue('leave')
        toast(`${was.name} left`)
      }
    })
    api.addListener('avatarChanged', (e: { id: string; avatarURL?: string }) => {
      const was = names.get(e.id)
      if (was && e.avatarURL) {
        names.set(e.id, { ...was, avatar: e.avatarURL })
        sync()
      }
    })
    api.addListener('displayNameChange', (e: { id: string; displayname?: string }) => {
      const was = names.get(e.id)
      if (was && e.displayname) {
        names.set(e.id, { ...was, name: e.displayname })
        sync()
      }
    })
    api.addListener('dominantSpeakerChanged', (e: { id: string }) => setSpeaker(e.id))
    // Jitsi's own messages are hidden (Igani draws the UI), so its errors are turned into ours
    api.addListener('errorOccurred', (e: { error?: { name?: string; message?: string; isFatal?: boolean } }) => {
      const name = e.error?.name ?? ''
      console.error('[igani-meet] error', name, e.error?.message ?? '')
      if (e.error?.isFatal || /auth|password|notAllowed|membersOnly|conferenceDestroyed|connection\.(droppedError|otherError)/i.test(name))
        failRef.current(/auth|notAllowed/i.test(name) ? 'The call service didn’t accept the pass for this call. If you’re the host, check the 8x8 settings on the Tests page.' : /membersOnly/i.test(name) ? 'The call hasn’t been opened by the host yet. Try again in a moment.' : 'The connection to the call was lost. Check your internet and try again.')
    })
    // never spin forever: if the call hasn't connected after a while, say so
    const timeout = setTimeout(() => {
      if (!joinedRef.current) failRef.current('Couldn’t connect to the call. Check your internet connection (or a firewall or VPN blocking video calls) and try again.')
    }, 30_000)
    api.addListener('audioMuteStatusChanged', (e: { muted: boolean }) => setMic(!e.muted))
    api.addListener('videoMuteStatusChanged', (e: { muted: boolean }) => setCam(!e.muted))
    api.addListener('screenSharingStatusChanged', (e: { on: boolean }) => setSharing(e.on))
    api.addListener('tileViewChanged', (e: { enabled: boolean }) => setTile(e.enabled))
    api.addListener('raiseHandUpdated', (e: { handRaised: number }) => setHand(Boolean(e.handRaised)))
    api.addListener('chatUpdated', (e: { isOpen: boolean; unreadCount: number }) => setChat({ open: e.isOpen, unread: e.unreadCount }))
    api.addListener('incomingMessage', (e: { nick?: string; message?: string }) => {
      playCue('message')
      toast(`${e.nick || 'Someone'}: ${(e.message ?? '').slice(0, 80)}`)
    })
    api.addListener('noisyMic', () => toast('Your microphone is picking up a lot of noise.', 'warn'))
    api.addListener('recordingStatusChanged', (e: { on: boolean; mode?: string; error?: string }) => {
      if (e.mode && e.mode !== 'file') return
      if (recPending.current) clearTimeout(recPending.current)
      recPending.current = null
      if (e.on && !recOn.current) toast('Recording started. Everyone in the call can see it’s being recorded.', 'rec')
      if (!e.on && recOn.current) toast(moderator ? 'Recording stopped. It will be on the Tests page in a few minutes.' : 'Recording stopped.', 'rec')
      if (e.error) toast(`Recording didn’t start (${e.error.replace(/^recording\./, '')}). Check recording is on in your 8x8 plan.`, 'warn')
      recOn.current = e.on
      setRec((r) => ({ on: e.on, since: e.on ? (r.since ?? Date.now()) : null, pending: false }))
    })
    const leave = (): void => leftRef.current(iLeft.current ? 'me' : 'ended')
    api.addListener('readyToClose', leave)
    api.addListener('videoConferenceLeft', leave)
    return () => {
      clearTimeout(timeout)
      if (recPending.current) clearTimeout(recPending.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listeners are added once per call; me/blur are the values at join
  }, [api, toast, moderator])

  // tell the lobby who's here: check in every 20s, check out on leaving
  useEffect(() => {
    if (!joinedAt) return
    const key = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('')
    const url = `/api/public/meet/${encodeURIComponent(presence.code)}/presence`
    const send = (leaving = false): void => {
      const body = JSON.stringify({ t: presence.token, key, name: me.name, ...(leaving ? { leaving: true } : {}) })
      if (leaving && navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      else void fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined)
    }
    send()
    const t = setInterval(() => send(), 20_000)
    const bye = (): void => send(true)
    window.addEventListener('pagehide', bye)
    return () => {
      clearInterval(t)
      window.removeEventListener('pagehide', bye)
      bye()
    }
  }, [joinedAt, presence.code, presence.token, me.name])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // the tab shows the call (and a red dot while recording)
  useEffect(() => {
    const before = document.title
    document.title = `${rec.on ? '● REC · ' : ''}${title} · Igani Meet`
    return () => {
      document.title = before
    }
  }, [rec.on, title])

  // M mutes, V turns the camera on and off, Esc closes menus; closing the tab asks first
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
      if (e.key === 'm' || e.key === 'M') api.executeCommand('toggleAudio')
      else if (e.key === 'v' || e.key === 'V') api.executeCommand('toggleVideo')
      else if (e.key === 'Escape') setPanel(null)
    }
    const onUnload = (e: BeforeUnloadEvent): void => e.preventDefault()
    window.addEventListener('keydown', onKey)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [api])

  const cmd = (name: string) => () => api.executeCommand(name)
  const closePanel = useCallback(() => setPanel(null), [])
  const hangup = (everyone = false): void => {
    iLeft.current = true
    setPanel(null)
    api.executeCommand(everyone ? 'endConference' : 'hangup')
  }
  const toggleRecording = (): void => {
    if (rec.pending) return
    if (rec.on) {
      api.executeCommand('stopRecording', 'file')
      return
    }
    setRec((r) => ({ ...r, pending: true }))
    api.executeCommand('startRecording', { mode: 'file' })
    recPending.current = setTimeout(() => {
      setRec((r) => ({ ...r, pending: false }))
      toast('Recording didn’t start. Check that recording is on in your 8x8 plan, then try again.', 'warn')
    }, 25_000)
  }
  const count = Object.keys(people).length + 1
  const ring: Person[] = [{ id: myId ?? 'me', name: me.name, avatar: me.avatar, you: true, speaking: count > 1 && speaker != null && speaker === myId }, ...Object.entries(people).map(([id, x]) => ({ id, name: x.name, avatar: x.avatar, speaking: speaker === id }))]
  const alone = Boolean(joinedAt) && count === 1

  const overlay = (
    <>
      <div className={cn('absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a1020] transition-opacity duration-500', joinedAt ? 'opacity-0' : 'opacity-100')}>
        <span className="relative flex h-16 w-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#3b78db]/30" />
          <span className={cn('relative flex h-16 w-16 items-center justify-center rounded-full shadow-xl shadow-[#3b78db]/40', GRAD)}>
            <Video className="h-7 w-7" />
          </span>
        </span>
        <p className="px-6 text-center text-sm text-white/70">Connecting you to {title}…</p>
      </div>
      {alone ? (
        <div className="absolute inset-x-0 top-4 flex justify-center px-4">
          <span className="meet-pop rounded-full bg-black/55 px-3.5 py-1.5 text-center text-xs text-white/80 ring-1 ring-white/10 backdrop-blur">You’re the only one here. Others will appear as they join.</span>
        </div>
      ) : null}
      <div className="absolute bottom-4 left-1/2 flex w-[min(92%,440px)] -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'meet-pop flex max-w-full items-center gap-2 rounded-xl px-3.5 py-2 text-sm shadow-xl ring-1 backdrop-blur-md',
              t.tone === 'rec' ? 'bg-rose-950/85 ring-rose-400/30' : t.tone === 'warn' ? 'bg-amber-950/85 text-amber-100 ring-amber-400/30' : 'bg-[#0c1322]/85 ring-white/10',
            )}
          >
            {t.tone === 'rec' ? <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" /> : null}
            <span className="truncate">{t.text}</span>
          </div>
        ))}
      </div>
    </>
  )

  return (
    <>
      {slot ? createPortal(overlay, slot) : null}
      <header className="relative flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <Brand small />
        <span className="hidden h-5 w-px bg-white/15 sm:block" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        {testServer ? <span className="hidden rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-200 ring-1 ring-amber-400/30 sm:inline">Test server</span> : null}
        {rec.on ? (
          <span className="flex items-center gap-1.5 rounded-full bg-rose-600/90 px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 ring-rose-300/40" title="This call is being recorded">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> REC{rec.since ? ` ${clock(Math.max(0, Math.floor((now - rec.since) / 1000)))}` : ''}
          </span>
        ) : null}
        <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs tabular-nums text-white/80 ring-1 ring-white/10">
          <span className={cn('h-1.5 w-1.5 rounded-full', joinedAt ? 'bg-emerald-400' : 'animate-pulse bg-amber-300')} />
          {joinedAt ? clock(Math.max(0, Math.floor((now - joinedAt) / 1000))) : 'Connecting…'}
        </span>
        <span className="hidden sm:block">
          <PeopleRings people={ring} max={5} size="sm" onClick={() => api.executeCommand('toggleParticipantsPane', { enabled: true })} />
        </span>
        <span className="sm:hidden">
          <PeopleRings people={ring} max={3} size="sm" onClick={() => api.executeCommand('toggleParticipantsPane', { enabled: true })} />
        </span>
      </header>
      <footer className="relative order-last flex items-center justify-center gap-2 px-3 pb-4 pt-1 sm:gap-3">
        <RoundButton on={mic} onClick={cmd('toggleAudio')} label={mic ? 'Mute (M)' : 'Unmute (M)'} icon={mic ? <Mic /> : <MicOff />} />
        <RoundButton on={cam} onClick={cmd('toggleVideo')} label={cam ? 'Stop video (V)' : 'Start video (V)'} icon={cam ? <Video /> : <VideoOff />} />
        <RoundButton on active={sharing} onClick={cmd('toggleShareScreen')} label={sharing ? 'Stop sharing' : 'Share screen'} icon={<MonitorUp />} className="hidden sm:flex" />
        {canRecord ? (
          <RoundButton
            on
            disabled={rec.pending}
            onClick={toggleRecording}
            label={rec.on ? 'Stop recording' : rec.pending ? 'Starting recording…' : 'Record the call'}
            icon={rec.pending ? <Loader2 className="animate-spin" /> : <CircleDot className={rec.on ? 'text-white' : 'text-rose-400'} />}
            className={rec.on ? 'bg-rose-600 ring-rose-300/50 hover:bg-rose-500' : undefined}
          />
        ) : null}
        <RoundButton on active={tile} onClick={cmd('toggleTileView')} label={tile ? 'Speaker view' : 'Grid view'} icon={<LayoutGrid />} className="hidden sm:flex" />
        <RoundButton on active={hand} onClick={cmd('toggleRaiseHand')} label={hand ? 'Lower hand' : 'Raise hand'} icon={<Hand />} />
        <RoundButton on active={chat.open} onClick={cmd('toggleChat')} label="Chat" icon={<MessageSquare />} badge={chat.open ? 0 : chat.unread} />
        <div className="relative">
          <RoundButton on active={panel === 'settings'} onClick={() => setPanel(panel === 'settings' ? null : 'settings')} label="Settings" icon={<Settings2 />} />
          {panel === 'settings' ? <SettingsPanel api={api} onClose={closePanel} /> : null}
        </div>
        <span className="mx-0.5 h-8 w-px bg-white/10 sm:mx-1" />
        <div className="relative">
          <RoundButton on danger onClick={() => (moderator && count > 1 ? setPanel(panel === 'leave' ? null : 'leave') : hangup())} label="Leave the call" icon={<PhoneOff />} />
          {panel === 'leave' ? (
            <Popover onClose={closePanel} className="right-0 w-60">
              <button type="button" onClick={() => hangup()} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-white/10">
                <LogOut className="h-4 w-4 text-white/60" /> Leave the call
              </button>
              <button type="button" onClick={() => hangup(true)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-rose-200 transition hover:bg-rose-500/15">
                <PhoneOff className="h-4 w-4" /> End the call for everyone
              </button>
            </Popover>
          ) : null}
        </div>
      </footer>
    </>
  )
}

function Popover({ children, onClose, className }: { children: React.ReactNode; onClose: () => void; className?: string }): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: PointerEvent): void => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose()
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [onClose])
  return (
    <div ref={ref} className={cn('meet-pop absolute bottom-[calc(100%+10px)] z-20 rounded-2xl bg-[#0c1322]/95 p-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-xl', className)}>
      {children}
    </div>
  )
}

const BLURS = [
  { key: 'none', label: 'Off' },
  { key: 'slight-blur', label: 'Light' },
  { key: 'blur', label: 'Strong' },
] as const
type Blur = (typeof BLURS)[number]['key']

/** Switch microphone, camera and speaker mid-call, and blur what's behind you. */
function SettingsPanel({ api, onClose }: { api: JitsiApi; onClose: () => void }): React.ReactElement {
  const [lists, setLists] = useState<DeviceLists>(NO_DEVICES)
  const [cur, setCur] = useState({ mic: '', cam: '', spk: '' })
  const [blur, setBlur] = useState<Blur>(() => readPrefs().blur ?? 'none')
  const [sounds, setSounds] = useState(() => readPrefs().sounds !== false)
  useEffect(() => {
    let live = true
    void Promise.all([api.getAvailableDevices(), api.getCurrentDevices()])
      .then(([l, c]) => {
        if (!live) return
        setLists({ audioInput: l.audioInput ?? [], audioOutput: l.audioOutput ?? [], videoInput: l.videoInput ?? [] })
        setCur({ mic: c.audioInput?.deviceId ?? '', cam: c.videoInput?.deviceId ?? '', spk: c.audioOutput?.deviceId ?? '' })
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [api])
  const choose = (kind: 'mic' | 'cam' | 'spk', id: string): void => {
    const list = kind === 'mic' ? lists.audioInput : kind === 'cam' ? lists.videoInput : lists.audioOutput
    const label = labelOf(list, id) ?? ''
    if (kind === 'mic') api.setAudioInputDevice(label, id)
    else if (kind === 'cam') api.setVideoInputDevice(label, id)
    else {
      api.setAudioOutputDevice(label, id)
      setSoundOutput(id)
    }
    setCur((c) => ({ ...c, [kind]: id }))
    writePrefs(kind === 'mic' ? { micId: id } : kind === 'cam' ? { camId: id } : { spkId: id })
  }
  return (
    <Popover onClose={onClose} className="left-1/2 w-[min(88vw,320px)] -translate-x-1/2 p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-sm font-semibold">Settings</span>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-white/50 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        <DeviceSelect icon={<Mic />} label="Microphone" list={lists.audioInput} value={cur.mic} onChange={(id) => choose('mic', id)} />
        <DeviceSelect icon={<Video />} label="Camera" list={lists.videoInput} value={cur.cam} onChange={(id) => choose('cam', id)} />
        <DeviceSelect icon={<Volume2 />} label="Speaker" list={lists.audioOutput} value={cur.spk} onChange={(id) => choose('spk', id)} />
      </div>
      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs text-white/60">
          <Sparkles className="h-3.5 w-3.5" /> Blur my background
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
          {BLURS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => {
                api.executeCommand('setBlurredBackground', b.key)
                setBlur(b.key)
                writePrefs({ blur: b.key })
              }}
              className={cn('flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs transition', blur === b.key ? 'bg-[#3b78db] font-medium' : 'text-white/70 hover:bg-white/10')}
            >
              {blur === b.key ? <Check className="h-3 w-3" /> : null}
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          const next = !sounds
          setSounds(next)
          setSoundsMuted(!next)
          writePrefs({ sounds: next })
          if (next) playCue('join')
        }}
        className="mt-3 flex w-full items-center gap-2 rounded-xl border-t border-white/10 px-1 pt-3 text-left text-xs text-white/70 transition hover:text-white"
      >
        {sounds ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
        <span className="flex-1">Sounds when people join and leave</span>
        <span className={cn('relative h-5 w-9 rounded-full transition', sounds ? 'bg-[#3b78db]' : 'bg-white/15')}>
          <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', sounds ? 'left-[18px]' : 'left-0.5')} />
        </span>
      </button>
    </Popover>
  )
}

function Notice({ title, body, action }: { title: string; body: string; action?: { label: string; onClick: () => void } }): React.ReactElement {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <Brand />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60">{body}</p>
      </div>
      {action ? (
        <button type="button" onClick={action.onClick} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-sm font-semibold ring-1 ring-white/15 transition hover:bg-white/15">
          <RotateCcw className="h-4 w-4" /> {action.label}
        </button>
      ) : null}
    </div>
  )
}

/** The page for a link that can't be used (unknown, ended, or no invite): same Igani Meet look, no room details. */
IganiMeet.Closed = function Closed({ title, body }: { title: string; body: string }): React.ReactElement {
  return (
    <div className="dark fixed inset-0 flex flex-col text-white" style={{ background: BG }}>
      <Glow />
      <Notice title={title} body={body} />
    </div>
  )
}
