import { ShieldCheck } from 'lucide-react'
import { CrmLogo } from '@/components/brand/CrmMark'
import { DevLogin } from '@/components/DevLogin'
import { GoogleSignIn } from '@/components/GoogleSignIn'
import { LoginBackdrop } from '@/components/LoginBackdrop'
import { LoginFeed } from '@/components/LoginFeed'
import { SIGNIN_ERRORS, safeCallback } from '@/lib/login'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Sign in' }

/**
 * Sign-in: Google only, and only for emails an admin has invited (the whitelist is checked on every sign-in).
 * Split layout: the form on one side, a brand panel with what the CRM does on the other.
 */
export default async function LoginPage(
  props: { searchParams: Promise<Record<string, string | string[] | undefined>> }
): Promise<React.ReactElement> {
  const searchParams = await props.searchParams;
  const token = typeof searchParams.invite === 'string' ? searchParams.invite.slice(0, 64) : ''
  const invite = token ? await prisma.allowedUser.findUnique({ where: { inviteToken: token }, select: { role: true, active: true } }) : null
  const error = typeof searchParams.error === 'string' ? (SIGNIN_ERRORS[searchParams.error] ?? 'Sign-in failed. Please try again.') : null
  const callbackUrl = safeCallback(searchParams.callbackUrl)
  const dev = process.env.NODE_ENV !== 'production' && process.env.DEV_LOGIN === '1'

  return (
    <main className="min-h-screen bg-[#030712] p-3 text-white sm:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1400px] gap-4 lg:min-h-[calc(100vh-2rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ── Form ── */}
        <section className="flex flex-col px-5 py-6 sm:px-10">
          <div className="self-start">
            <CrmLogo height={28} onDark />
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
          <LoginBackdrop />

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
