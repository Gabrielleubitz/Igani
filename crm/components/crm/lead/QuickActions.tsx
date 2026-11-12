'use client'

import { Calendar, CheckSquare, MoreHorizontal, Phone, Mail, StickyNote } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { CallLink } from '@/components/dialer/Dialer'
import { BriefMeButton } from '@/components/crm/BriefMeButton'
import { EditContactForm } from '@/components/crm/EditContactForm'
import { EditLeadButton } from '@/components/crm/EditLeadButton'
import { EmailComposer } from '@/components/crm/EmailComposer'
import { LeadActions } from '@/components/crm/LeadActions'
import { AddNoteForm, AddTaskForm, LogTouchButtons } from '@/components/crm/LeadNotesTasks'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const circle = 'flex h-10 w-10 items-center justify-center rounded-full border bg-card text-foreground shadow-sm transition hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

function Round({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex w-14 flex-col items-center gap-1 text-[11px] text-muted-foreground">
      {children}
      <span>{label}</span>
    </div>
  )
}

export interface QuickActionsProps {
  leadId: string
  name: string
  email: string | null
  firstName: string | null
  company: string | null
  phone: string | null
  senderName: string
  bookingUrl: string | null
  canMeet: boolean
  teammates: { id: string; label: string }[]
  currentUserId: string
  timeZone: string
  archived: boolean
  canArchive: boolean
  isAdmin: boolean
  edit: React.ComponentProps<typeof EditContactForm>
}

/** The round buttons under the contact's name: Note, Email, Call, Task, Meeting and a "More" menu. */
export function QuickActions(p: QuickActionsProps): React.ReactElement {
  const [dialog, setDialog] = useState<'note' | 'task' | null>(null)
  const [more, setMore] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!more) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMore(false)
    }
    const onDown = (e: MouseEvent): void => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('dialog')) setMore(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [more])
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-1 gap-y-2">
      <Round label="Note">
        <button type="button" aria-label="Add a note" className={circle} onClick={() => setDialog('note')}>
          <StickyNote className="h-[18px] w-[18px]" />
        </button>
      </Round>
      {p.email ? (
        <Round label="Email">
          <EmailComposer
            leadId={p.leadId}
            email={p.email}
            firstName={p.firstName}
            company={p.company}
            senderName={p.senderName}
            bookingUrl={p.bookingUrl}
            renderTrigger={(open) => (
              <button type="button" aria-label="Send an email" className={circle} onClick={open}>
                <Mail className="h-[18px] w-[18px]" />
              </button>
            )}
          />
        </Round>
      ) : null}
      {p.phone ? (
        <Round label="Call">
          <CallLink phone={p.phone} lead={{ id: p.leadId, name: p.name }} className={circle}>
            <Phone className="h-[18px] w-[18px]" aria-label="Call" />
          </CallLink>
        </Round>
      ) : null}
      <Round label="Task">
        <button type="button" aria-label="Add a task" className={circle} onClick={() => setDialog('task')}>
          <CheckSquare className="h-[18px] w-[18px]" />
        </button>
      </Round>
      {p.canMeet ? (
        <Round label="Meeting">
          <Link href={`/sales/invite?leadId=${p.leadId}`} aria-label="Invite to a meeting" className={circle}>
            <Calendar className="h-[18px] w-[18px]" />
          </Link>
        </Round>
      ) : null}
      <Round label="More">
        <div ref={moreRef} className="relative">
          <button type="button" aria-label="More actions" aria-expanded={more} className={circle} onClick={() => setMore((v) => !v)}>
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
          {more ? (
            <div className="absolute right-0 top-12 z-30 w-64 space-y-3 rounded-xl border bg-card p-3 text-left shadow-2xl">
              <div className="flex flex-wrap gap-2">
                <BriefMeButton leadId={p.leadId} name={p.name} />
                <EditLeadButton name={p.name} {...p.edit} />
              </div>
              <LogTouchButtons leadId={p.leadId} />
              <LeadActions leadId={p.leadId} archived={p.archived} canArchive={p.canArchive} isAdmin={p.isAdmin} name={p.name} />
            </div>
          ) : null}
        </div>
      </Round>

      <Dialog open={dialog === 'note'} onClose={() => setDialog(null)} title={`Note on ${p.name}`} description="Saved on the contact’s timeline.">
        <AddNoteForm leadId={p.leadId} onDone={() => setDialog(null)} />
      </Dialog>
      <Dialog open={dialog === 'task'} onClose={() => setDialog(null)} title={`Task for ${p.name}`} description="A follow-up with a due date, so nothing slips." className={cn('max-w-md')}>
        <AddTaskForm leadId={p.leadId} teammates={p.teammates} currentUserId={p.currentUserId} timeZone={p.timeZone} onDone={() => setDialog(null)} />
      </Dialog>
    </div>
  )
}
