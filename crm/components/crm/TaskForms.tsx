'use client'

import { CalendarPlus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { createTaskFor, deleteTeamTask } from '@/app/actions/tasks'
import { setMeetingTask } from '@/app/sales/actions'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { TASK_PRIORITIES, type TaskPriority } from './crm-utils'

export interface Option {
  id: string
  label: string
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240]
const fmtDuration = (m: number): string => (m < 60 ? `${m} min` : `${m / 60} h`.replace('.5 h', '½ h'))

/**
 * New task from the Tasks page: for me or (admins) anyone, about a contact or a general team task,
 * optionally blocked out on that person's calendar (Today + their Google Calendar).
 */
export function NewTaskForm({ me, assignees, leads, isAdmin }: { me: string; assignees: Option[]; leads: Option[]; isAdmin: boolean }): React.ReactElement {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState(me)
  const [leadQuery, setLeadQuery] = useState('')
  const [leadId, setLeadId] = useState<string | null>(null)
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [toCalendar, setToCalendar] = useState(false)
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const matches = useMemo(() => {
    const q = leadQuery.trim().toLowerCase()
    if (!q || leads.some((l) => l.label === leadQuery)) return []
    return leads.filter((l) => l.label.toLowerCase().includes(q)).slice(0, 8)
  }, [leadQuery, leads])
  const forSomeoneElse = assigneeId !== me
  const who = assignees.find((a) => a.id === assigneeId)?.label ?? 'them'

  function submit(e: React.FormEvent): void {
    e.preventDefault()
    setMsg(null)
    start(async () => {
      const res = await createTaskFor({
        title,
        assigneeId,
        leadId,
        dueAt: due ? new Date(due).toISOString() : null,
        priority,
        addToCalendar: toCalendar,
        durationMin: duration,
        notes: notes || undefined,
      })
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      setMsg({ ok: true, text: toCalendar ? `Task added and blocked on ${forSomeoneElse ? `${who}'s` : 'your'} calendar.` : 'Task added.' })
      setTitle('')
      setNotes('')
      setLeadId(null)
      setLeadQuery('')
      setToCalendar(false)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-sm">
      <label className="block space-y-1">
        <span className="font-medium">Task</span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Send the revised proposal" required maxLength={200} autoFocus />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="font-medium">For</span>
          <Select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={!isAdmin && assignees.length < 2}>
            {assignees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id === me ? `${a.label} (me)` : a.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1">
          <span className="font-medium">Priority</span>
          <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0) + p.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="block space-y-1">
        <span className="font-medium">Contact (optional)</span>
        <div className="relative">
          <Input
            value={leadQuery}
            onChange={(e) => {
              setLeadQuery(e.target.value)
              setLeadId(null)
            }}
            placeholder="Leave empty for a general team task"
            autoComplete="off"
            aria-label="Contact"
          />
          {matches.length ? (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
              {matches.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setLeadId(l.id)
                      setLeadQuery(l.label)
                    }}
                    className="w-full rounded px-2 py-1.5 text-start hover:bg-muted"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {leadQuery && !leadId ? <span className="text-xs text-amber-400">Pick a contact from the list, or clear the field.</span> : null}
      </div>
      <label className="block space-y-1">
        <span className="font-medium">Due</span>
        <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <div className="space-y-2 rounded-md border border-border p-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={toCalendar} onChange={(e) => setToCalendar(e.target.checked)} />
          <CalendarPlus className="h-4 w-4 text-muted-foreground" aria-hidden />
          <span>Block it on {forSomeoneElse ? `${who}'s` : 'my'} calendar</span>
        </label>
        {toCalendar ? (
          <div className="flex flex-wrap items-center gap-2 ps-6">
            <span className="text-muted-foreground">for</span>
            <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-8 w-28">
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {fmtDuration(d)}
                </option>
              ))}
            </Select>
            <span className="text-xs text-muted-foreground">at the due time · shows on Today and in their Google Calendar</span>
          </div>
        ) : null}
      </div>
      <label className="block space-y-1">
        <span className="font-medium">Notes (optional)</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} className="w-full rounded-md border border-input bg-background px-3 py-2" />
      </label>
      {msg ? <p className={msg.ok ? 'text-emerald-400' : 'text-rose-400'}>{msg.text}</p> : null}
      <Button type="submit" disabled={pending || !title.trim() || (!!leadQuery && !leadId) || (toCalendar && !due)}>
        {pending ? 'Adding…' : 'Add task'}
      </Button>
    </form>
  )
}

const PRIORITY_TONE: Record<string, string> = { HIGH: 'text-rose-400 border-rose-500/40', MEDIUM: 'text-amber-300 border-amber-500/30', LOW: 'text-muted-foreground border-border' }

/** A team task (not about a contact): tick to complete, optional calendar badge, delete for owner / admin / creator. */
export function TeamTaskRow({
  ownerId,
  taskId,
  title,
  done: initial,
  dueLabel,
  overdue,
  priority,
  meta,
  onCalendar,
  canDelete,
}: {
  ownerId: string
  taskId: string
  title: string
  done: boolean
  dueLabel: string | null
  overdue: boolean
  priority: string
  meta?: string
  onCalendar: boolean
  canDelete: boolean
}): React.ReactElement {
  const router = useRouter()
  const [done, setDone] = useState(initial)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className={`group flex items-start gap-3 py-2.5 text-sm ${pending ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        aria-label={done ? `Reopen ${title}` : `Complete ${title}`}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[hsl(var(--primary))]"
        checked={done}
        disabled={pending}
        onChange={() => {
          const was = done
          setDone(!was)
          start(async () => {
            const res = await setMeetingTask(ownerId, taskId, !was)
            if (!res.ok) {
              setDone(was)
              setError(res.error)
            } else router.refresh()
          })
        }}
      />
      <div className="min-w-0 flex-1">
        <div className={`flex flex-wrap items-center gap-2 font-medium ${done ? 'text-muted-foreground line-through' : ''}`}>
          {title}
          <span className="rounded-full border px-1.5 py-px text-[10px] uppercase tracking-wide text-muted-foreground">team</span>
          <span className={`rounded-full border px-1.5 py-px text-[10px] uppercase tracking-wide ${PRIORITY_TONE[priority] ?? ''}`}>{priority.toLowerCase()}</span>
          {onCalendar ? <CalendarPlus className="h-3.5 w-3.5 text-muted-foreground" aria-label="On the calendar" /> : null}
        </div>
        <div className="text-xs text-muted-foreground">
          {dueLabel ? <span className={overdue && !done ? 'text-red-400' : ''}>{dueLabel}</span> : 'No due date'}
          {meta ? ` · ${meta}` : ''}
        </div>
        {error ? <div className="text-xs text-red-400">{error}</div> : null}
      </div>
      {canDelete ? (
        <button
          type="button"
          aria-label={`Delete ${title}`}
          className="rounded p-1 text-muted-foreground opacity-0 hover:text-rose-400 focus:opacity-100 group-hover:opacity-100"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await deleteTeamTask(ownerId, taskId)
              if (!res.ok) setError(res.error)
              else router.refresh()
            })
          }
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
