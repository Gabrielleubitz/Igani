'use client'

import { createContext, useContext } from 'react'

/** Where Meet's pages live on this host ("" on meet.igani.co, "/meet" inside the CRM) and where the CRM is. */
interface MeetPaths {
  base: '' | '/meet'
  crm: string
}

const Ctx = createContext<MeetPaths>({ base: '/meet', crm: '/sales/today' })

export function MeetPathsProvider({ value, children }: { value: MeetPaths; children: React.ReactNode }): React.ReactElement {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** `path("/abc")` → "/abc" on the Meet host, "/meet/abc" in the CRM; `path("/")` → the Meet home. */
export function useMeetPaths(): { path: (p: string) => string; crm: string } {
  const { base, crm } = useContext(Ctx)
  return { path: (p) => (p === '/' ? base || '/' : `${base}${p}`), crm }
}
