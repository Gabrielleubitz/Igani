'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { MapPin, User } from 'lucide-react'
import { WhatsAppGlyph } from '@/components/SocialGlyphs'
import { getTeamMembers } from '@/lib/firestore'
import { TeamMember } from '@/types'
import { founderWhatsAppHref } from './contact'

/**
 * "Who we are", right above the form: the line on the left, the three founders on the right as small
 * photos that each open their WhatsApp.
 */
export function WhoWeAre() {
  const [team, setTeam] = useState<TeamMember[]>([])
  useEffect(() => {
    getTeamMembers()
      .then((all) => setTeam(all.filter((m) => m.published && m.name.trim()).slice(0, 3)))
      .catch((error) => console.error('Error loading team:', error))
  }, [])

  return (
    <div className="mx-auto mb-14 max-w-4xl px-4">
      <div className="flex flex-col gap-6 rounded-[28px] border border-white/15 bg-white/[0.08] p-6 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
        <div className="max-w-md">
          <div className="flex items-center gap-3 text-[13px] text-white/70">
            <span>Who we are</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Based in Netanya, Israel
            </span>
          </div>
          <p className="!mt-3 text-lg leading-relaxed text-white">
            We specialize in real estate websites, so we already know listings, lead capture, and what makes sellers pick up the phone. When you ask for a
            call, one of us calls you back, not a sales rep.
          </p>
        </div>

        <ul className="flex shrink-0 items-start justify-end gap-3 sm:gap-4">
          {(team.length ? team : [null, null, null]).map((m, i) => {
            const first = m?.name.split(' ')[0]
            return (
              <li key={m?.id ?? i} className="w-16 text-center sm:w-[72px]">
                <a
                  href={m ? founderWhatsAppHref(m.name) : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={m ? `Message ${first} on WhatsApp` : undefined}
                  className="group relative block aspect-square overflow-hidden rounded-full border-2 border-white/30 bg-[#061225] transition-colors hover:border-white"
                >
                  {m?.imageUrl ? (
                    <img src={m.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <User className="h-6 w-6 text-white/40" />
                    </span>
                  )}
                  {/* Hover and touch cue that the photo is a WhatsApp link */}
                  <span className="absolute inset-0 flex items-center justify-center bg-[#04101e]/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <WhatsAppGlyph className="h-5 w-5 text-white" />
                  </span>
                </a>
                <div className="mt-2 text-[13px] font-semibold leading-tight text-white">{first ?? ' '}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] leading-none text-white/65">
                  <WhatsAppGlyph className="h-3 w-3" />
                  WhatsApp
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
