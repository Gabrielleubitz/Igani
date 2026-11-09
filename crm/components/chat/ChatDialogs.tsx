'use client'

import { Check, Hash, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { chatCreateChannel, chatUpdateChannel, type ChatChannelInfo } from '@/app/actions/chat'
import { Avatar } from '@/components/chat/ChatParts'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import type { ChatPerson } from '@/lib/chat'
import { cn } from '@/lib/utils'

export function NewChannelDialog({ open, people, onClose, onCreated }: { open: boolean; people: ChatPerson[]; onClose: () => void; onCreated: (id: string) => void }): React.ReactElement {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [priv, setPriv] = useState(false)
  const [members, setMembers] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return (
    <Dialog open={open} onClose={onClose} title="New channel" description="Channels are where the team talks about a topic, a client or a project.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const r = await chatCreateChannel({ name, topic: topic || null, private: priv, memberIds: members })
          setBusy(false)
          if (!r.ok) return setError(r.error)
          setName('')
          setTopic('')
          setMembers([])
          setPriv(false)
          setError(null)
          onCreated(r.data.id)
        }}
      >
        <div>
          <Label htmlFor="ch-name">Name</Label>
          <div className="relative mt-1">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. sales-floor" className="pl-8" maxLength={60} autoFocus required />
          </div>
          {slug && slug !== name ? <p className="mt-1 text-xs text-muted-foreground">Will be #{slug}</p> : null}
        </div>
        <div>
          <Label htmlFor="ch-topic">Topic (optional)</Label>
          <Input id="ch-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What it's for" className="mt-1" maxLength={200} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
          <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Lock className="h-3.5 w-3.5" /> Private
            </span>
            <span className="text-xs text-muted-foreground">Only the people in it can see it. Otherwise everyone on the team can read and join.</span>
          </span>
        </label>
        <div>
          <Label>Add people {priv ? '' : '(optional)'}</Label>
          <PeoplePicker people={people} value={members} onChange={setMembers} />
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !slug}>
            Create channel
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function PeoplePicker({ people, value, onChange }: { people: ChatPerson[]; value: string[]; onChange: (v: string[]) => void }): React.ReactElement {
  const [q, setQ] = useState('')
  const list = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="mt-1 rounded-lg border">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the team" className="rounded-b-none border-0 border-b" aria-label="Search the team" />
      <ul className="max-h-56 overflow-y-auto p-1">
        {list.map((p) => {
          const on = value.includes(p.id)
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onChange(on ? value.filter((v) => v !== p.id) : [...value, p.id])} className={cn('flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm', on ? 'bg-primary/15' : 'hover:bg-muted')} aria-pressed={on}>
                <Avatar name={p.name} photo={p.photo} size={26} className="rounded-md" />
                <span className="flex-1 truncate">{p.name}</span>
                {on ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            </li>
          )
        })}
        {!list.length ? <li className="px-2 py-3 text-center text-sm text-muted-foreground">No one matches.</li> : null}
      </ul>
    </div>
  )
}

export function PeopleDialog({ open, title, people, meId, multi, onClose, onPick }: { open: boolean; title: string; people: ChatPerson[]; meId: string; multi?: boolean; onClose: () => void; onPick: (ids: string[]) => void }): React.ReactElement {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const list = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {multi ? (
        <>
          <PeoplePicker people={people} value={sel} onChange={setSel} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!sel.length}
              onClick={() => {
                onPick(sel)
                setSel([])
              }}
            >
              Add {sel.length || ''}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the team" autoFocus aria-label="Search the team" />
          <ul className="mt-2 max-h-80 overflow-y-auto">
            {list.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onPick([p.id])} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted">
                  <Avatar name={p.name} photo={p.photo} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {p.name}
                      {p.id === meId ? ' (you)' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.role === 'ADMIN' ? 'Admin' : p.role === 'SALES' ? 'Sales' : 'Marketing'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  )
}

export function TopicDialog({ open, info, onClose, onSaved }: { open: boolean; info: ChatChannelInfo; onClose: () => void; onSaved: () => void }): React.ReactElement {
  const [name, setName] = useState(info.name)
  const [topic, setTopic] = useState(info.topic ?? '')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setName(info.name)
    setTopic(info.topic ?? '')
  }, [info.name, info.topic, open])
  return (
    <Dialog open={open} onClose={onClose} title={`Edit #${info.name}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await chatUpdateChannel({ channelId: info.id, ...(info.name === 'general' ? {} : { name }), topic: topic || null })
          if (!r.ok) return setError(r.error)
          onSaved()
        }}
      >
        {info.name !== 'general' ? (
          <div>
            <Label htmlFor="t-name">Name</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" maxLength={60} />
          </div>
        ) : null}
        <div>
          <Label htmlFor="t-topic">Topic</Label>
          <Input id="t-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1" maxLength={200} placeholder="What this channel is for" />
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Dialog>
  )
}
