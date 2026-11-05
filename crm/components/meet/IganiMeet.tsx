'use client'

import { Hand, LayoutGrid, Loader2, MessageSquare, Mic, MicOff, MonitorUp, PhoneOff, RotateCcw, Users, Video, VideoOff } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { joinMeet } from '@/app/actions/meet'
import type { MeetConfig } from '@/lib/meet'
import { cn } from '@/lib/utils'

/* The parts of Jitsi's iframe API we use (https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe). */
interface JitsiApi {
  executeCommand(name: string, ...args: unknown[]): void
  addListener(event: string, fn: (e: never) => void): void
  getNumberOfParticipants(): number
  dispose(): void
}
type JitsiCtor = new (domain: string, opts: Record<string, unknown>) => JitsiApi
declare global {
  interface Window {
    JitsiMeetExternalAPI?: JitsiCtor
  }
}

function loadScript(src: string): Promise<JitsiCtor> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI)
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => (window.JitsiMeetExternalAPI ? resolve(window.JitsiMeetExternalAPI) : reject(new Error('The video service did not load.')))
    s.onerror = () => reject(new Error('Could not reach the video service. Check your connection and try again.'))
    document.head.appendChild(s)
  })
}

const BG = '#060a14'

/** Jitsi with its own interface switched off: Igani draws the header, controls and screens. */
function jitsiOptions(cfg: MeetConfig, node: HTMLElement, me: { name: string; email: string | null }, start: { mic: boolean; cam: boolean }, title: string): Record<string, unknown> {
  return {
    roomName: cfg.roomName,
    jwt: cfg.jwt ?? undefined,
    parentNode: node,
    width: '100%',
    height: '100%',
    userInfo: { displayName: me.name, email: me.email ?? undefined },
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
      conferenceInfo: { alwaysVisible: [], autoHide: [] },
      disableInviteFunctions: true,
      disableProfile: true,
      readOnlyName: true,
      disableReactions: true,
      disablePolls: true,
      giphy: { enabled: false },
      notifications: [],
      disableJoinLeaveSounds: false,
      welcomePage: { disabled: true },
      enableClosePage: false,
      disableThirdPartyRequests: true,
      analytics: { disabled: true },
      securityUi: { hideLobbyButton: true },
      breakoutRooms: { hideAddRoomButton: true, hideJoinRoomButton: true },
      defaultLanguage: 'en',
      p2p: { enabled: true },
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
}

type Phase = 'prejoin' | 'joining' | 'live' | 'left' | 'error'

export function IganiMeet(p: IganiMeetProps): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('prejoin')
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(p.defaultName)
  const [mic, setMic] = useState(true)
  const [cam, setCam] = useState(true)
  const [testServer, setTestServer] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const api = useRef<JitsiApi | null>(null)
  const [liveApi, setLiveApi] = useState<JitsiApi | null>(null)

  const join = useCallback(async () => {
    setPhase('joining')
    setError(null)
    const res = await joinMeet({ code: p.code, token: p.token, name: name.trim() || p.defaultName })
    if (!res.ok) {
      setError(res.error)
      setPhase('error')
      return
    }
    try {
      const Ctor = await loadScript(res.data.config.scriptUrl)
      if (!stage.current) return
      setTestServer(res.data.config.testServer)
      api.current?.dispose()
      api.current = new Ctor(res.data.config.domain, jitsiOptions(res.data.config, stage.current, { name: res.data.name, email: p.email }, { mic, cam }, p.title))
      setLiveApi(api.current)
      setPhase('live')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the call.')
      setPhase('error')
    }
  }, [p.code, p.token, p.defaultName, p.email, p.title, name, mic, cam])

  useEffect(() => () => api.current?.dispose(), [])

  return (
    <div className="dark fixed inset-0 flex flex-col text-white" style={{ background: BG }}>
      {/* brand glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,120,219,0.18),transparent_70%)]" />
      {phase === 'prejoin' || phase === 'joining' ? (
        <PreJoin {...p} name={name} setName={setName} mic={mic} setMic={setMic} cam={cam} setCam={setCam} joining={phase === 'joining'} onJoin={join} />
      ) : null}
      {phase === 'error' ? <Notice title="We couldn’t connect you" body={error ?? 'Something went wrong.'} action={{ label: 'Try again', onClick: () => setPhase('prejoin') }} /> : null}
      {phase === 'left' ? (
        <Notice
          title="You left the call"
          body={`Thanks for joining ${p.title}.`}
          action={{
            label: 'Rejoin',
            onClick: () => {
              setPhase('prejoin')
            },
          }}
        />
      ) : null}
      {/* the call itself stays mounted while live */}
      <div className={cn('relative flex min-h-0 flex-1 flex-col', phase !== 'live' && 'hidden')}>
        {phase === 'live' && liveApi ? (
          <Live
            api={liveApi}
            title={p.title}
            testServer={testServer}
            startMic={mic}
            startCam={cam}
            onLeft={() => {
              api.current?.dispose()
              api.current = null
              setLiveApi(null)
              setPhase('left')
            }}
            onFail={(why) => {
              api.current?.dispose()
              api.current = null
              setLiveApi(null)
              setError(why)
              setPhase('error')
            }}
          />
        ) : null}
        <div ref={stage} className="relative mx-2 mb-2 min-h-0 flex-1 overflow-hidden rounded-2xl ring-1 ring-white/10 sm:mx-4" />
      </div>
    </div>
  )
}

function Brand({ small = false }: { small?: boolean }): React.ReactElement {
  return (
    <span className="flex items-center gap-2">
      <Image src="/igani-logo.png" alt="Igani" width={small ? 57 : 71} height={small ? 24 : 30} priority style={{ height: small ? 24 : 30, width: 'auto' }} />
      <span className={cn('rounded-md bg-gradient-to-br from-[#6aa6ff] to-[#2f5fd0] px-1.5 py-0.5 font-semibold uppercase tracking-wider text-white shadow-lg shadow-[#3b78db]/30', small ? 'text-[10px]' : 'text-[11px]')}>Meet</span>
    </span>
  )
}

function PreJoin(p: IganiMeetProps & { name: string; setName: (v: string) => void; mic: boolean; setMic: (v: boolean) => void; cam: boolean; setCam: (v: boolean) => void; joining: boolean; onJoin: () => void }): React.ReactElement {
  const video = useRef<HTMLVideoElement>(null)
  const [perm, setPerm] = useState<'asking' | 'ok' | 'denied' | 'none'>('asking')
  const { cam, joining } = p

  // camera preview; released before joining so the call can take the camera
  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    if (!cam || joining) return
    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setPerm('none'))
      return
    }
    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop())
        stream = s
        if (video.current) video.current.srcObject = s
        setPerm('ok')
      })
      .catch((e: unknown) => setPerm(e instanceof DOMException && e.name === 'NotAllowedError' ? 'denied' : 'none'))
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [cam, joining])

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Brand />
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-5 pb-10 sm:px-8 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-[#0c1322] ring-1 ring-white/10">
          {cam && perm === 'ok' ? <video ref={video} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" /> : null}
          {cam && perm !== 'ok' ? <video ref={video} autoPlay playsInline muted className="hidden" /> : null}
          {!cam || perm !== 'ok' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#6aa6ff] to-[#2f5fd0] text-3xl font-semibold shadow-xl shadow-[#3b78db]/30">{(p.name || '?').charAt(0).toUpperCase()}</span>
              <p className="max-w-xs text-sm text-white/60">{!cam ? 'Camera is off' : perm === 'asking' ? 'Starting your camera…' : perm === 'denied' ? 'Camera blocked. Allow it in your browser’s address bar, or join with it off.' : 'No camera found. You can still join.'}</p>
            </div>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-gradient-to-t from-black/60 to-transparent p-4">
            <RoundButton on={p.mic} onClick={() => p.setMic(!p.mic)} label={p.mic ? 'Mute microphone' : 'Unmute microphone'} icon={p.mic ? <Mic /> : <MicOff />} />
            <RoundButton on={p.cam} onClick={() => p.setCam(!p.cam)} label={p.cam ? 'Turn camera off' : 'Turn camera on'} icon={p.cam ? <Video /> : <VideoOff />} />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7fb0ff]">{p.hostName ? `${p.hostName} invited you` : 'Ready to join?'}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{p.title}</h1>
            <p className="mt-2 text-sm text-white/60">Video call on Igani Meet. Check your camera and sound, then join.</p>
          </div>
          <label className="block">
            <span className="text-xs text-white/60">Your name</span>
            <input
              value={p.name}
              onChange={(e) => p.setName(e.target.value)}
              readOnly={!p.nameEditable}
              maxLength={60}
              className={cn('mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm outline-none transition focus:border-[#6aa6ff]/60 focus:ring-2 focus:ring-[#6aa6ff]/30', !p.nameEditable && 'text-white/70')}
            />
          </label>
          <button
            type="button"
            disabled={p.joining || !p.name.trim()}
            onClick={p.onJoin}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#6aa6ff] to-[#2f5fd0] text-sm font-semibold shadow-lg shadow-[#3b78db]/35 transition hover:brightness-110 disabled:opacity-60"
          >
            {p.joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
            {p.joining ? 'Joining…' : 'Join now'}
          </button>
          <p className="text-xs text-white/40">{p.mic ? 'Microphone on' : 'Microphone off'} · {p.cam ? 'camera on' : 'camera off'}. You can change both during the call.</p>
        </div>
      </main>
    </div>
  )
}

function RoundButton({ on, onClick, label, icon, danger = false, active = false, badge }: { on: boolean; onClick: () => void; label: string; icon: React.ReactElement; danger?: boolean; active?: boolean; badge?: number }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(
        'relative flex h-12 w-12 items-center justify-center rounded-full ring-1 transition [&_svg]:h-5 [&_svg]:w-5',
        danger ? 'bg-rose-600 ring-rose-400/40 hover:bg-rose-500' : !on ? 'bg-rose-500/90 ring-rose-300/30 hover:bg-rose-500' : active ? 'bg-[#3b78db] ring-[#6aa6ff]/50' : 'bg-white/10 ring-white/15 hover:bg-white/15',
      )}
    >
      {icon}
      {badge ? <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#6aa6ff] px-1 text-[10px] font-bold text-[#060a14]">{badge}</span> : null}
    </button>
  )
}

function Live({ api, title, testServer, startMic, startCam, onLeft, onFail }: { api: JitsiApi; title: string; testServer: boolean; startMic: boolean; startCam: boolean; onLeft: () => void; onFail: (why: string) => void }): React.ReactElement {
  const [mic, setMic] = useState(startMic)
  const [cam, setCam] = useState(startCam)
  const [sharing, setSharing] = useState(false)
  const [tile, setTile] = useState(false)
  const [hand, setHand] = useState(false)
  const [chat, setChat] = useState({ open: false, unread: 0 })
  const [count, setCount] = useState(1)
  const [joinedAt, setJoinedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const leftRef = useRef(onLeft)
  const failRef = useRef(onFail)
  const joinedRef = useRef(false)
  useEffect(() => {
    leftRef.current = onLeft
    failRef.current = onFail
  }, [onLeft, onFail])

  useEffect(() => {
    const people = (): void => setCount(Math.max(1, api.getNumberOfParticipants()))
    api.addListener('videoConferenceJoined', () => {
      joinedRef.current = true
      setJoinedAt(Date.now())
      people()
    })
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
    api.addListener('participantJoined', people)
    api.addListener('participantLeft', people)
    api.addListener('audioMuteStatusChanged', (e: { muted: boolean }) => setMic(!e.muted))
    api.addListener('videoMuteStatusChanged', (e: { muted: boolean }) => setCam(!e.muted))
    api.addListener('screenSharingStatusChanged', (e: { on: boolean }) => setSharing(e.on))
    api.addListener('tileViewChanged', (e: { enabled: boolean }) => setTile(e.enabled))
    api.addListener('raiseHandUpdated', (e: { handRaised: number }) => setHand(Boolean(e.handRaised)))
    api.addListener('chatUpdated', (e: { isOpen: boolean; unreadCount: number }) => setChat({ open: e.isOpen, unread: e.unreadCount }))
    api.addListener('readyToClose', () => leftRef.current())
    api.addListener('videoConferenceLeft', () => leftRef.current())
    return () => clearTimeout(timeout)
  }, [api])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const cmd = (name: string) => () => api.executeCommand(name)
  return (
    <>
      <header className="relative flex items-center gap-3 px-4 py-3 sm:px-6">
        <Brand small />
        <span className="hidden h-5 w-px bg-white/15 sm:block" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        {testServer ? <span className="hidden rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-medium text-amber-200 ring-1 ring-amber-400/30 sm:inline">Test server</span> : null}
        <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs tabular-nums text-white/80 ring-1 ring-white/10">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {joinedAt ? clock(Math.max(0, Math.floor((now - joinedAt) / 1000))) : 'Connecting…'}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs tabular-nums text-white/80 ring-1 ring-white/10" title="People in the call">
          <Users className="h-3.5 w-3.5" /> {count}
        </span>
      </header>
      <footer className="order-last flex items-center justify-center gap-2.5 px-4 pb-4 pt-1 sm:gap-3">
        <RoundButton on={mic} onClick={cmd('toggleAudio')} label={mic ? 'Mute' : 'Unmute'} icon={mic ? <Mic /> : <MicOff />} />
        <RoundButton on={cam} onClick={cmd('toggleVideo')} label={cam ? 'Stop video' : 'Start video'} icon={cam ? <Video /> : <VideoOff />} />
        <span className="hidden sm:contents">
          <RoundButton on active={sharing} onClick={cmd('toggleShareScreen')} label={sharing ? 'Stop sharing' : 'Share screen'} icon={<MonitorUp />} />
        </span>
        <RoundButton on active={tile} onClick={cmd('toggleTileView')} label={tile ? 'Speaker view' : 'Grid view'} icon={<LayoutGrid />} />
        <RoundButton on active={hand} onClick={cmd('toggleRaiseHand')} label={hand ? 'Lower hand' : 'Raise hand'} icon={<Hand />} />
        <RoundButton on active={chat.open} onClick={cmd('toggleChat')} label="Chat" icon={<MessageSquare />} badge={chat.open ? 0 : chat.unread} />
        <span className="mx-1 h-8 w-px bg-white/10" />
        <RoundButton on danger onClick={() => api.executeCommand('hangup')} label="Leave the call" icon={<PhoneOff />} />
      </footer>
    </>
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
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(59,120,219,0.18),transparent_70%)]" />
      <Notice title={title} body={body} />
    </div>
  )
}
