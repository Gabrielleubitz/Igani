import { ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { DevLogin } from '@/components/DevLogin'
import { GoogleSignIn } from '@/components/GoogleSignIn'
import { LoginFeed } from '@/components/LoginFeed'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Sign in' }

function safeCallback(value: string | string[] | undefined): string {
  const v = typeof value === 'string' ? value : '/'
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/'
}

/** NextAuth error codes → plain words (no internals). */
const ERRORS: Record<string, string> = {
  OAuthSignin: 'Google could not start the sign-in. Please try again.',
  OAuthCallback: 'Google sign-in was interrupted. Please try again.',
  OAuthAccountNotLinked: 'This Google account is linked differently. Ask an admin to check your access.',
  AccessDenied: 'This Google account is not on the team.',
  Callback: 'Sign-in failed. Please try again.',
  SessionRequired: 'Please sign in to continue.',
}

/**
 * Sign-in: Google only, and only for emails an admin has invited (the whitelist is checked on every sign-in).
 * Split layout: the form on one side, a brand panel with what the CRM does on the other.
 */
export default async function LoginPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Promise<React.ReactElement> {
  const token = typeof searchParams.invite === 'string' ? searchParams.invite.slice(0, 64) : ''
  const invite = token ? await prisma.allowedUser.findUnique({ where: { inviteToken: token }, select: { role: true, active: true } }) : null
  const error = typeof searchParams.error === 'string' ? (ERRORS[searchParams.error] ?? 'Sign-in failed. Please try again.') : null
  const callbackUrl = safeCallback(searchParams.callbackUrl)
  const dev = process.env.NODE_ENV !== 'production' && process.env.DEV_LOGIN === '1'

  return (
    <main className="min-h-screen bg-[#030712] p-3 text-white sm:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1400px] gap-4 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ── Form ── */}
        <section className="flex flex-col px-5 py-6 sm:px-10">
          <div className="self-start">
            <Logo height={28} />
          </div>
          <div className="my-auto w-full max-w-[420px] py-12">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-400" aria-hidden />
              Team access only
            </div>
            <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-5xl">Welcome back</h1>
            <p className="mt-4 text-[17px] leading-7 text-slate-400">
              {invite?.active ? (
                <>
                  You&apos;ve been invited as <b className="font-semibold text-white">{invite.role.toLowerCase()}</b>. Continue with the Google account the invite was sent to.
                </>
              ) : (
                'Sign in to your pipeline, meetings, offers and contracts.'
              )}
            </p>
            {error ? <div className="mt-6 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30">{error}</div> : null}
            <div className="mt-8">
              <GoogleSignIn callbackUrl={callbackUrl} />
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Only teammates an admin has invited can get in. Ask an admin if your Google account isn&apos;t accepted.
            </p>
            {dev ? (
              <div className="mt-8 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 [&_.border-t]:border-white/10">
                <DevLogin callbackUrl={callbackUrl} />
              </div>
            ) : null}
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} Igani · Team CRM</p>
        </section>

        {/* ── Brand panel ── */}
        <section aria-hidden className="relative hidden overflow-hidden rounded-[32px] bg-[#0a1230] lg:block">
          {/* Base glow, slowly breathing */}
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#0b1a3d,#0a1230)]" />
          <span className="login-orb absolute -right-[20%] -top-[25%] h-[75%] w-[75%] rounded-full bg-[radial-gradient(closest-side,rgba(37,99,235,0.85),transparent)] [animation-duration:26s]" />
          <span className="login-orb absolute -bottom-[30%] -left-[20%] h-[80%] w-[80%] rounded-full bg-[radial-gradient(closest-side,rgba(79,70,229,0.8),transparent)] [animation-delay:-9s] [animation-duration:32s]" />
          <span className="login-orb absolute left-[30%] top-[35%] h-[45%] w-[45%] rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.35),transparent)] [animation-delay:-4s] [animation-duration:22s]" />
          {/* Silky ribbons: each drifts on its own long, eased loop, so the motion never visibly repeats */}
          {(
            [
              { top: '-6%', h: '26%', from: '#93c5fd', via: '#3b82f6', to: '#1e3a8a', dur: '28s', delay: '0s' },
              { top: '14%', h: '18%', from: '#c4b5fd', via: '#6366f1', to: '#1e1b4b', dur: '34s', delay: '-11s' },
              { top: '30%', h: '30%', from: '#e0f2fe', via: '#60a5fa', to: '#1d4ed8', dur: '40s', delay: '-23s' },
              { top: '54%', h: '16%', from: '#a5b4fc', via: '#4f46e5', to: '#172554', dur: '31s', delay: '-6s' },
              { top: '68%', h: '24%', from: '#bae6fd', via: '#38bdf8', to: '#1e40af', dur: '37s', delay: '-17s' },
            ] as const
          ).map((r, i) => (
            <span key={i} className="login-ribbon absolute -left-[45%] w-[190%]" style={{ top: r.top, height: r.h, animationDuration: r.dur, animationDelay: r.delay }}>
              <span
                className="absolute inset-0 opacity-90"
                style={{ background: `linear-gradient(90deg, transparent 0%, ${r.to} 18%, ${r.via} 48%, ${r.from} 72%, transparent 100%)`, maskImage: 'linear-gradient(180deg, transparent 0%, #000 38%, #000 52%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 38%, #000 52%, transparent 100%)' }}
              />
              <span className="absolute inset-x-[10%] top-[42%] h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </span>
          ))}
          {/* A soft sheen that sweeps across every few seconds */}
          <span className="login-sheen absolute -inset-y-1/4 -left-1/2 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]" />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.15)_0%,transparent_30%,rgba(3,7,18,0.7)_100%)]" />
          <span className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" />
          <style>{`
            .login-ribbon{transform:translate3d(-4%,0,0) rotate(-30deg);animation:login-ribbon ease-in-out infinite alternate;will-change:transform}
            @keyframes login-ribbon{0%{transform:translate3d(-6%,-2%,0) rotate(-31deg)}50%{transform:translate3d(2%,3%,0) rotate(-28deg)}100%{transform:translate3d(7%,-1%,0) rotate(-30deg)}}
            .login-orb{animation:login-orb ease-in-out infinite alternate;will-change:transform}
            @keyframes login-orb{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(-8%,6%,0) scale(1.12)}100%{transform:translate3d(6%,-5%,0) scale(0.95)}}
            .login-sheen{transform:translate3d(0,0,0) rotate(20deg);animation:login-sheen 9s cubic-bezier(.45,0,.55,1) infinite;will-change:transform}
            @keyframes login-sheen{0%{transform:translate3d(0,0,0) rotate(20deg);opacity:0}15%{opacity:1}55%{transform:translate3d(520%,0,0) rotate(20deg);opacity:1}70%,100%{transform:translate3d(520%,0,0) rotate(20deg);opacity:0}}
            @media (prefers-reduced-motion: reduce){.login-ribbon,.login-orb,.login-sheen{animation:none}}
          `}</style>

          <div className="absolute inset-x-8 top-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand mark */}
              <img src="/android-chrome-192x192.png" alt="" width={36} height={36} className="h-9 w-9 rounded-[10px] shadow-lg shadow-black/30 ring-1 ring-white/15" />
              <div className="leading-tight">
                <div className="text-[15px] font-semibold tracking-tight text-white">Igani</div>
                <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">Sales workspace</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 ring-1 ring-white/15 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live
            </div>
          </div>
          <div className="absolute inset-x-8 bottom-8 space-y-5">
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.02em]">From first call to signed contract, in one place.</h2>
            <div className="max-w-xl">
              <LoginFeed />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
