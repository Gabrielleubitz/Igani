'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addNote, completeTask, createTask, logTouch } from '@/app/sales/actions'
import { Button } from '@/components/ui/button'
import { TASK_PRIORITIES, type TaskPriority } from '@/components/crm/crm-utils'
import { Input, Select, Textarea } from '@/components/ui/input'

export function AddNoteForm({ leadId }: { leadId: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await addNote(leadId, body)
          setError(res.ok ? null : res.error)
          if (res.ok) setBody('')
          router.refresh()
        })
      }}
    >
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Add a note, or pick Log call / email / meeting above to record what happened…" maxLength={5000} />
      <div className="flex items-center gap-3">
        <Button size="sm" type="submit" disabled={pending || !body.trim()}>
          Add note
        </Button>
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </form>
  )
}

export function AddTaskForm({ leadId }: { leadId: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM')
  const [error, setError] = useState<string | null>(null)
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await createTask(leadId, title, due ? new Date(due).toISOString() : null, priority)
          setError(res.ok ? null : res.error)
          if (res.ok) {
            setTitle('')
            setDue('')
          }
          router.refresh()
        })
      }}
    >
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing? e.g. Send proposal" className="h-9 w-64" maxLength={200} />
      <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 w-52" />
      <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className="h-9 w-32">
        {TASK_PRIORITIES.map((x) => (
          <option key={x} value={x}>
            {x.toLowerCase()}
          </option>
        ))}
      </Select>
      <Button size="sm" type="submit" disabled={pending || !title.trim()}>
        Add task
      </Button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </form>
  )
}

export function CompleteTaskButton({ leadId, taskId }: { leadId: string; taskId: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await completeTask(leadId, taskId)
          router.refresh()
        })
      }
    >
      Done
    </Button>
  )
}

const TOUCHES = [
  ['call', 'Log call'],
  ['email', 'Log email'],
  ['meeting', 'Log meeting'],
  ['whatsapp', 'Log WhatsApp'],
] as const

export function LogTouchButtons({ leadId }: { leadId: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TOUCHES.map(([kind, label]) => (
        <Button
          key={kind}
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            const summary = window.prompt(`${label}: what was discussed? (optional)`)
            if (summary === null) return
            start(async () => {
              const res = await logTouch(leadId, kind, summary)
              setError(res.ok ? null : res.error)
              router.refresh()
            })
          }}
        >
          {label}
        </Button>
      ))}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  )
}
