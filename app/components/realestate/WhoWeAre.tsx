'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { User } from 'lucide-react'
import { getTeamMembers } from '@/lib/firestore'
import { TeamMember } from '@/types'

/** "Who we are": the founders' faces and one line, right above the form, so a real person is behind the offer. */
export function WhoWeAre() {
  const [team, setTeam] = useState<TeamMember[]>([])
  useEffect(() => {
    getTeamMembers()
      .then((all) => setTeam(all.filter((m) => m.published && m.name.trim()).slice(0, 3)))
      .catch((error) => console.error('Error loading team:', error))
  }, [])

  const names = team.map((m) => m.name.split(' ')[0])
  const nameLine = names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}` : names[0]

  return (
    <div className="mx-auto mb-12 flex max-w-3xl flex-col items-center gap-5 px-4 text-center sm:flex-row sm:gap-6 sm:text-left">
      <div className="flex shrink-0 -space-x-3">
        {(team.length ? team : [null, null, null]).map((m, i) => (
          <span key={m?.id ?? i} className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#1a4fae] bg-[#061225]">
            {m?.imageUrl ? (
              <img src={m.imageUrl} alt={m.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <User className="h-7 w-7 text-white/40" />
              </span>
            )}
          </span>
        ))}
      </div>
      <div>
        <div className="text-[13px] text-white/70">Who we are{nameLine ? ` · ${nameLine}, founders of IGANI` : ''}</div>
        <p className="!mt-1.5 text-lg leading-relaxed text-white">
          We specialize in real estate websites, so we already know IDX, lead capture, and what makes sellers pick up the phone.
        </p>
      </div>
    </div>
  )
}
