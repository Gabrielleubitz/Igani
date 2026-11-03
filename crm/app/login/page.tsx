import { KanbanSquare, PenLine, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { DevLogin } from '@/components/DevLogin'
import { GoogleSignIn } from '@/components/GoogleSignIn'
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
        <section aria-hidden className="relative hidden overflow-hidden rounded-[32px] bg-[#0b1530] lg:block">
          {/* silky ribbons: colour along the band, soft edges across it (mask), a thin highlight on top */}
          <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_85%_5%,#1d4ed8_0%,transparent_65%),radial-gradient(60%_55%_at_5%_95%,#4338ca_0%,transparent_65%),linear-gradient(160deg,#0b1a3d,#0a1230)]" />
          {(
            [
              { top: '-6%', h: '26%', from: '#93c5fd', via: '#3b82f6', to: '#1e3a8a', d: '0s' },
              { top: '14%', h: '18%', from: '#c4b5fd', via: '#6366f1', to: '#1e1b4b', d: '2s' },
              { top: '30%', h: '30%', from: '#e0f2fe', via: '#60a5fa', to: '#1d4ed8', d: '4s' },
              { top: '54%', h: '16%', from: '#a5b4fc', via: '#4f46e5', to: '#172554', d: '1s' },
              { top: '68%', h: '24%', from: '#bae6fd', via: '#38bdf8', to: '#1e40af', d: '3s' },
            ] as const
          ).map((r, i) => (
            <span key={i} className="absolute -left-[35%] w-[170%] -rotate-[30deg] [animation:ribbon_16s_ease-in-out_infinite_alternate] motion-reduce:animate-none" style={{ top: r.top, height: r.h, animationDelay: r.d }}>
              <span
                className="absolute inset-0 opacity-90"
                style={{ background: `linear-gradient(90deg, transparent 0%, ${r.to} 18%, ${r.via} 48%, ${r.from} 72%, transparent 100%)`, maskImage: 'linear-gradient(180deg, transparent 0%, #000 38%, #000 52%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 38%, #000 52%, transparent 100%)' }}
              />
              <span className="absolute inset-x-[10%] top-[42%] h-px bg-gradient-to-r from-transparent via-white/70 to-transparent blur-[0.5px]" />
            </span>
          ))}
          <span className="absolute inset-0 backdrop-blur-[1.5px]" />
          <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(3,7,18,0.75))]" />
          <span className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" />
          <style>{'@keyframes ribbon{from{transform:translateX(-3%) rotate(-30deg)}to{transform:translateX(4%) rotate(-27deg)}}'}</style>

          <div className="absolute inset-x-8 top-8 flex items-center gap-2 text-sm font-medium text-white/80">
            <Sparkles className="h-4 w-4" /> Igani CRM
          </div>
          <div className="absolute inset-x-8 bottom-8 space-y-4">
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.02em]">From first call to signed contract, in one place.</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: KanbanSquare, title: 'Pipeline & meetings', body: 'Every lead, call, task and follow-up, with Google Calendar and Gmail in sync.' },
                { icon: PenLine, title: 'Offers & contracts', body: 'Proposal pages with live mockups, signed online and saved on the lead.' },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-xl">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="mt-3 font-semibold">{title}</div>
                  <p className="mt-1 text-sm leading-6 text-white/75">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
