'use client'

import { Check, ExternalLink, Globe, ListChecks, Loader2, MapPin, Phone, Search, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { callListChoices, type ListChoice } from '@/app/actions/call-lists'
import { addToCallList, findBusinesses, type FoundPlace } from '@/app/actions/places'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label, Select } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const host = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * "Find businesses": search Google Maps (e.g. real estate in Jerusalem), tick results and put them on a call list.
 * They show up in the dialer's Lists tab; a call that goes well makes the business a lead.
 */
export function FindBusinesses(): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [what, setWhat] = useState('')
  const [where, setWhere] = useState('')
  const [query, setQuery] = useState('')
  // "Load more" must repeat exactly the search Google gave the page token for.
  const [last, setLast] = useState({ what: '', where: '' })
  const [places, setPlaces] = useState<FoundPlace[] | null>(null)
  const [next, setNext] = useState<{ token: string; page: number } | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [searching, startSearch] = useTransition()
  const [importing, startImport] = useTransition()
  const [choices, setChoices] = useState<ListChoice | null>(null)
  /** an existing list's id, or 'new' */
  const [target, setTarget] = useState('new')
  const [listName, setListName] = useState('')
  const [owner, setOwner] = useState('')
  const [added, setAdded] = useState<{ listId: string; listName: string } | null>(null)

  useEffect(() => {
    if (!open || choices) return
    void callListChoices().then((r) => {
      if (r.ok) {
        setChoices(r.data)
        setOwner(r.data.me)
      }
    })
  }, [open, choices])

  const canPick = (p: FoundPlace): boolean => !p.existing && Boolean(p.phone)
  const pickable = (places ?? []).filter(canPick)

  const run = (more: boolean): void => {
    setMsg(null)
    startSearch(async () => {
      const terms = more ? last : { what, where }
      const r = await findBusinesses({ ...terms, pageToken: more ? next?.token : null, page: more ? (next?.page ?? 1) : 1 })
      if (!r.ok) {
        setMsg({ ok: false, text: r.error })
        return
      }
      const fresh = r.data.places
      setQuery(r.data.query)
      setLast(terms)
      if (!more) {
        setAdded(null)
        // a new list is named after the search, unless you've typed a name
        setListName((n) => (n && n !== query ? n : r.data.query))
      }
      setPlaces((prev) => {
        const base = more && prev ? prev : []
        const ids = new Set(base.map((p) => p.placeId))
        return [...base, ...fresh.filter((p) => !ids.has(p.placeId))]
      })
      // New results start ticked when they can be added.
      setPicked((prev) => new Set([...(more ? prev : []), ...fresh.filter(canPick).map((p) => p.placeId)]))
      setNext(r.data.nextPageToken ? { token: r.data.nextPageToken, page: r.data.page + 1 } : null)
    })
  }

  const add = (): void => {
    const chosen = (places ?? []).filter((p) => picked.has(p.placeId) && canPick(p))
    if (!chosen.length) return
    if (target === 'new' && !listName.trim()) {
      setMsg({ ok: false, text: 'Name the new call list.' })
      return
    }
    setMsg(null)
    startImport(async () => {
      const r = await addToCallList({
        query,
        places: chosen.map(({ existing: _e, ...p }) => p),
        ...(target === 'new' ? { newList: { name: listName.trim(), ...(owner ? { ownerId: owner } : {}) } } : { listId: target }),
      })
      if (!r.ok) {
        setMsg({ ok: false, text: r.error })
        return
      }
      const { added: n, skipped, listId, listName: name } = r.data
      setMsg({ ok: true, text: `✓ Added ${n} to “${name}”${skipped ? ` (${skipped} skipped: already known)` : ''}.` })
      setAdded({ listId, listName: name })
      // Mark them so they can't be added twice, and keep adding to the same list.
      setPlaces((prev) => (prev ?? []).map((p) => (picked.has(p.placeId) && !p.existing ? { ...p, existing: { kind: 'list', listId, list: name, owner: null, status: 'To call' } } : p)))
      setPicked(new Set())
      setTarget(listId)
      setChoices((c) => (c && !c.lists.some((l) => l.id === listId) ? { ...c, lists: [{ id: listId, name, owner: null }, ...c.lists] } : c))
      router.refresh()
    })
  }

  const allPicked = pickable.length > 0 && pickable.every((p) => picked.has(p.placeId))

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Search className="me-1.5 h-4 w-4" aria-hidden /> Find businesses
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Find businesses on Google"
        description="Search Google Maps by type and city, tick the ones you want, and put them on a call list. We then read each business’s website for named contacts, other numbers, emails and social pages. Call them from the dialer’s Lists tab; when a call goes well, the business becomes a lead."
        className="w-[min(96vw,46rem)]"
      >
        <form
          className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault()
            if (what.trim().length >= 2) run(false)
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="fb-what">Type of business</Label>
            <Input id="fb-what" value={what} onChange={(e) => setWhat(e.target.value)} placeholder="e.g. real estate agency" dir="auto" autoFocus maxLength={100} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="fb-where">City or area</Label>
            <Input id="fb-where" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="e.g. Jerusalem" dir="auto" maxLength={100} />
          </div>
          <Button type="submit" disabled={searching || what.trim().length < 2}>
            {searching && !next ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <Search className="me-1.5 h-4 w-4" />}
            Search
          </Button>
        </form>

        {places ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                {places.length} result{places.length === 1 ? '' : 's'} for <span className="font-medium text-foreground">“{query}”</span>
              </span>
              {pickable.length ? (
                <button type="button" className="text-primary hover:underline" onClick={() => setPicked(allPicked ? new Set() : new Set(pickable.map((p) => p.placeId)))}>
                  {allPicked ? 'Untick all' : 'Tick all new'}
                </button>
              ) : null}
            </div>
            <ul className="max-h-[52vh] divide-y overflow-y-auto rounded-lg border">
              {places.length === 0 ? <li className="p-4 text-sm text-muted-foreground">Nothing found. Try a broader type or another spelling of the city.</li> : null}
              {places.map((p) => {
                const ok = canPick(p)
                const on = picked.has(p.placeId)
                return (
                  <li key={p.placeId}>
                    <label className={cn('flex gap-3 px-3 py-2.5', ok ? 'cursor-pointer hover:bg-muted/40' : 'opacity-70')}>
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                        checked={on}
                        disabled={!ok}
                        onChange={() =>
                          setPicked((prev) => {
                            const s = new Set(prev)
                            if (s.has(p.placeId)) s.delete(p.placeId)
                            else s.add(p.placeId)
                            return s
                          })
                        }
                      />
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          <span dir="auto" className="font-medium">{p.name}</span>
                          {p.category ? <span className="text-xs text-muted-foreground">{p.category}</span> : null}
                          {p.rating != null ? (
                            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden /> {p.rating.toFixed(1)}
                              {p.reviews != null ? ` (${p.reviews})` : ''}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          {p.phone ? (
                            <span className="inline-flex items-center gap-1 tabular-nums" dir="ltr">
                              <Phone className="h-3 w-3" aria-hidden /> {p.phone}
                            </span>
                          ) : (
                            <span className="text-amber-400">No phone listed</span>
                          )}
                          {p.website ? (
                            <a href={p.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                              <Globe className="h-3 w-3" aria-hidden /> {host(p.website)}
                            </a>
                          ) : null}
                          {p.mapsUrl ? (
                            <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-foreground" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="h-3 w-3" aria-hidden /> Maps
                            </a>
                          ) : null}
                        </span>
                        {p.address ? (
                          <span dir="auto" className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden /> <span className="truncate">{p.address}</span>
                          </span>
                        ) : null}
                        {p.existing?.kind === 'lead' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                            <Check className="h-3 w-3" aria-hidden />
                            {p.existing.id ? (
                              <Link href={`/sales/leads/${p.existing.id}`} className="underline underline-offset-2">
                                Already a lead
                              </Link>
                            ) : (
                              'Already a lead'
                            )}
                            {p.existing.owner ? ` · ${p.existing.owner}` : ''}
                          </span>
                        ) : p.existing?.kind === 'list' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-sky-300">
                            <ListChecks className="h-3 w-3" aria-hidden />
                            On call list{' '}
                            {p.existing.listId ? (
                              <Link href={`/sales/call-lists/${p.existing.listId}`} className="underline underline-offset-2">
                                {p.existing.list}
                              </Link>
                            ) : (
                              p.existing.list
                            )}
                            {p.existing.owner ? ` · ${p.existing.owner}` : ''} · {p.existing.status}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {msg ? <p className={cn('text-sm', msg.ok ? 'text-emerald-400' : 'text-rose-400')}>{msg.text}</p> : null}

        {places && places.length ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="fb-list">Call list</Label>
                <Select id="fb-list" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="new">+ New list</option>
                  {(choices?.lists ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.owner ? ` (${l.owner})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              {target === 'new' ? (
                <div className="space-y-1">
                  <Label htmlFor="fb-list-name">List name</Label>
                  <Input id="fb-list-name" value={listName} onChange={(e) => setListName(e.target.value)} maxLength={120} dir="auto" placeholder="e.g. Real estate · Jerusalem" />
                </div>
              ) : null}
              {target === 'new' && choices && choices.teammates.length > 1 ? (
                <div className="space-y-1">
                  <Label htmlFor="fb-owner">Who calls it</Label>
                  <Select id="fb-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
                    {choices.teammates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id === choices.me ? `Me (${t.name})` : t.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {next ? (
                <Button type="button" variant="outline" disabled={searching} onClick={() => run(true)}>
                  {searching ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : null} Load 20 more
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Google shows up to 60 results per search.</span>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {added ? (
                  <Link href={`/sales/call-lists/${added.listId}`} className="text-sm text-primary hover:underline">
                    Open “{added.listName}” →
                  </Link>
                ) : null}
                <Button type="button" disabled={importing || picked.size === 0} onClick={add}>
                  {importing ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <ListChecks className="me-1.5 h-4 w-4" />}
                  {importing ? 'Adding…' : `Add ${picked.size} to call list`}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  )
}
