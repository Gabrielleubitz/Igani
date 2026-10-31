'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addNote, completeTask, createTask, deleteTask, logTouch, reopenTask, updateTask } from '@/app/sales/actions'
import { TASK_PRIORITIES, type TaskPriority } from '@/components/crm/crm-utils'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Res = { ok: boolean; error?: string }

/** Run a server action, show its error, refresh the page on success. */
function useRun(): { pending: boolean; error: string | null; run: (fn: () => Promise<Res>, onOk?: () => void) => void } {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return {
    pending,
    error,
    run: (fn, onOk) =>
      start(async () => {
        const res = await fn()
        setError(res.ok ? null : (res.error ?? 'Something went wrong.'))
        if (res.ok) onOk?.()
        router.refresh()
      }),
  }
}

export function AddNoteForm({ leadId }: { leadId: string }): React.ReactElement {
  const { pending, error, run } = useRun()
  const [body, setBody] = useState('')
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => addNote(leadId, body), () => setBody(''))
      }}
    >
      <Label htmlFor="note" className="sr-only">
        Note
      </Label>
      <Textarea
        id="note"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) e.currentTarget.form?.requestSubmit()
        }}
        placeholder="Write a note… (Ctrl/⌘ + Enter to save)"
        maxLength={5000}
        rows={3}
      />
      <div className="flex items-center gap-3">
        <Button size="sm" type="submit" disabled={pending || !body.trim()}>
          {pending ? 'Saving…' : 'Add note'}
        </Button>
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </form>
  )
}

const TOUCHES = [
  ['call', 'Call', '📞'],
  ['email', 'Email', '✉️'],
  ['meeting', 'Meeting', '🤝'],
  ['whatsapp', 'WhatsApp', '💬'],
] as const

/** Quick "I just did X" logging. Opens a small dialog for an optional summary. */
export function LogTouchButtons({ leadId }: { leadId: string }): React.ReactElement {
  const { pending, error, run } = useRun()
  const [kind, setKind] = useState<(typeof TOUCHES)[number] | null>(null)
  const [summary, setSummary] = useState('')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Log</span>
      {TOUCHES.map((t) => (
        <Button
          key={t[0]}
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setSummary('')
            setKind(t)
          }}
        >
          <span aria-hidden>{t[2]}</span> {t[1]}
        </Button>
      ))}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
      <Dialog open={kind !== null} onClose={() => setKind(null)} title={`Log ${kind?.[1].toLowerCase() ?? ''}`} description="Recording a touch resets the 'needs follow-up' clock for this contact.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!kind) return
            const k = kind[0]
            run(() => logTouch(leadId, k, summary))
            setKind(null)
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="touch-summary">What happened? (optional)</Label>
            <Textarea id="touch-summary" autoFocus rows={3} maxLength={2000} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="e.g. Interested, wants pricing by Friday" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setKind(null)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}

export interface Teammate {
  id: string
  label: string
}

/** Convert a Date to the value a <input type="datetime-local"> expects, in the browser's zone. */
function toLocalInput(d: Date | null): string {
  if (!d) return ''
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

const QUICK_DUE: [string, () => Date][] = [
  ['Today 5pm', () => { const d = new Date(); d.setHours(17, 0, 0, 0); return d }],
  ['Tomorrow 9am', () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d }],
  ['In 3 days', () => { const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(9, 0, 0, 0); return d }],
  ['Next week', () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); return d }],
]

export function AddTaskForm({ leadId, teammates, currentUserId }: { leadId: string; teammates: Teammate[]; currentUserId: string }): React.ReactElement {
  const { pending, error, run } = useRun()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [assignee, setAssignee] = useState(currentUserId)
  return (
    <form
      className="space-y-2 rounded-md border border-dashed p-3"
      onSubmit={(e) => {
        e.preventDefault()
        run(
          () => createTask(leadId, title, due ? new Date(due).toISOString() : null, priority, assignee || null),
          () => {
            setTitle('')
            setDue('')
            setPriority('MEDIUM')
          },
        )
      }}
    >
      <Input aria-label="Task title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New task, e.g. Send proposal" className="h-9" maxLength={200} />
      <div className="flex flex-wrap gap-1">
        {QUICK_DUE.map(([label, fn]) => (
          <button key={label} type="button" onClick={() => setDue(toLocalInput(fn()))} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input aria-label="Due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="col-span-2 h-9" />
        <Select aria-label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="h-9">
          {TASK_PRIORITIES.map((x) => (
            <option key={x} value={x}>
              {x.charAt(0) + x.slice(1).toLowerCase()} priority
            </option>
          ))}
        </Select>
        <Select aria-label="Assign to" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="h-9">
          <option value="">Unassigned</option>
          {teammates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id === currentUserId ? 'Me' : t.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" type="submit" disabled={pending || !title.trim()}>
          {pending ? 'Adding…' : 'Add task'}
        </Button>
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </form>
  )
}

export function CompleteTaskButton({ leadId, taskId }: { leadId: string; taskId: string }): React.ReactElement {
  const { pending, error, run } = useRun()
  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => completeTask(leadId, taskId))} title="Mark as done">
        ✓ Done
      </Button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </span>
  )
}

export interface TaskView {
  id: string
  leadId: string
  title: string
  dueAt: string | null
  dueLabel: string | null
  priority: TaskPriority
  assigneeId: string | null
  assigneeLabel: string | null
  done: boolean
  overdue: boolean
  auto: string | null
}

const PRIORITY_TONE: Record<TaskPriority, string> = {
  HIGH: 'border-rose-500/40 text-rose-300',
  MEDIUM: 'border-amber-500/30 text-amber-200',
  LOW: 'border-border text-muted-foreground',
}

/** One task with complete / reopen / edit / delete. Used on the contact page and the Tasks page. */
export function TaskRow({ task, teammates, contact }: { task: TaskView; teammates: Teammate[]; contact?: React.ReactNode }): React.ReactElement {
  const { pending, error, run } = useRun()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [due, setDue] = useState(toLocalInput(task.dueAt ? new Date(task.dueAt) : null))
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [assignee, setAssignee] = useState(task.assigneeId ?? '')
  return (
    <div className={cn('group flex items-start gap-3 py-2.5 text-sm', pending && 'opacity-60')}>
      <input
        type="checkbox"
        aria-label={task.done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[hsl(var(--primary))]"
        checked={task.done}
        disabled={pending}
        onChange={() => run(() => (task.done ? reopenTask(task.leadId, task.id) : completeTask(task.leadId, task.id)))}
      />
      <div className="min-w-0 flex-1">
        <div className={cn('font-medium', task.done && 'text-muted-foreground line-through')}>
          {task.title}
          <span className={cn('ml-2 rounded-full border px-1.5 py-px text-[10px] uppercase tracking-wide', PRIORITY_TONE[task.priority])}>{task.priority.toLowerCase()}</span>
          {task.auto ? <span className="ml-1 rounded-full border px-1.5 py-px text-[10px] uppercase tracking-wide text-muted-foreground">auto</span> : null}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
          {contact}
          {task.dueLabel ? <span className={task.overdue && !task.done ? 'font-medium text-red-400' : ''}>{task.overdue && !task.done ? 'Overdue · ' : 'Due '}{task.dueLabel}</span> : <span>No due date</span>}
          <span>· {task.assigneeLabel ?? 'Unassigned'}</span>
        </div>
        {error ? <div className="text-xs text-red-400">{error}</div> : null}
      </div>
      <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-400" disabled={pending} onClick={() => window.confirm(`Delete task "${task.title}"?`) && run(() => deleteTask(task.leadId, task.id))}>
          Delete
        </Button>
      </div>
      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit task">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => updateTask(task.leadId, task.id, { title, dueAt: due ? new Date(due).toISOString() : null, priority, assigneeId: assignee || null }), () => setEditing(false))
          }}
        >
          <div className="space-y-1">
            <Label htmlFor={`t-${task.id}`}>Title</Label>
            <Input id={`t-${task.id}`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`d-${task.id}`}>Due</Label>
            <Input id={`d-${task.id}`} type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`p-${task.id}`}>Priority</Label>
              <Select id={`p-${task.id}`} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {TASK_PRIORITIES.map((x) => (
                  <option key={x} value={x}>
                    {x.charAt(0) + x.slice(1).toLowerCase()}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`a-${task.id}`}>Assigned to</Label>
              <Select id={`a-${task.id}`} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                <option value="">Unassigned</option>
                {teammates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              Save
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
