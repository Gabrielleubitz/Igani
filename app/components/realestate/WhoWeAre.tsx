'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { MapPin, User } from 'lucide-react'
import { getTeamMembers } from '@/lib/firestore'
import { TeamMember } from '@/types'

// Short role for under each face; the team page's titles run long
const shortRole = (position: string) => position.split('|')[0].trim()

/** "Who we are": the three founders' faces, names and where they're based, right above the form. The call back comes from one of them. */
export function WhoWeAre() {
  const [team, setTeam] = useState<TeamMember[]>([])
  useEffect(() => {
    getTeamMembers()
      .then((all) => setTeam(all.filter((m) => m.published && m.name.trim()).slice(0, 3)))
      .catch((error) => console.error('Error loading team:', error))
  }, [])

  return (
    <div className="mx-auto mb-14 max-w-4xl px-4">
      <div className="rounded-[28px] border border-white/15 bg-white/[0.08] p-6 backdrop-blur-md sm:p-8">
        <div className="flex items-baseline justify-between gap-4 text-[13px] text-white/70">
          <span>Who we are</span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Based in Netanya, Israel
          </span>
        </div>
        <ul className="mt-6 grid grid-cols-3 gap-3 sm:gap-6">
          {(team.length ? team : [null, null, null]).map((m, i) => (
            <li key={m?.id ?? i} className="text-center">
              <span className="mx-auto block aspect-square w-full max-w-[140px] overflow-hidden rounded-full border-2 border-white/30 bg-[#061225]">
                {m?.imageUrl ? (
                  <img src={m.imageUrl} alt={m.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <User className="h-8 w-8 text-white/40" />
                  </span>
                )}
              </span>
              <div className="mt-3 text-[15px] font-semibold leading-tight text-white sm:text-lg">{m?.name ?? ' '}</div>
              <div className="mt-0.5 text-[12px] leading-snug text-white/65 sm:text-[13px]">{m ? shortRole(m.position) : ' '}</div>
            </li>
          ))}
        </ul>
        <p className="!mt-7 text-center text-lg leading-relaxed text-white sm:text-xl">
          We specialize in real estate websites, so we already know listings, lead capture, and what makes sellers pick up the phone. When you ask for a call,
          one of us calls you back, not a sales rep.
        </p>
      </div>
    </div>
  )
}
