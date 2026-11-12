'use client'

import { Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { callListChoices, importCsvToCallList, type CsvImportResult, type ListChoice } from '@/app/actions/call-lists'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label, Select } from '@/components/ui/input'
import { EXAMPLE_CSV, IMPORT_MAX_CHARS, ImportFileError, prepareImport, type PreparedImport } from '@/lib/call-list-import'

/** "Import CSV" on the Call lists page: pick a file, see what's usable, choose the list (admins: who gets it), import. */
export function ImportCallListCsv(): React.ReactElement {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [choices, setChoices] = useState<ListChoice | null>(null)
  const [fileName, setFileName] = useState('')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<PreparedImport | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [target, setTarget] = useState('new')
  const [listName, setListName] = useState('')
  const [owner, setOwner] = useState('')
  const [result, setResult] = useState<CsvImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const reset = (): void => {
    setFileName('')
    setText('')
    setPreview(null)
    setFileError(null)
    setResult(null)
    setError(null)
    setListName('')
    setTarget('new')
    setOwner('')
    if (fileRef.current) fileRef.current.value = ''
  }
  const show = (): void => {
    reset()
    setOpen(true)
    void callListChoices().then((r) => r.ok && setChoices(r.data))
  }
  const onFile = async (file: File | undefined): Promise<void> => {
    setPreview(null)
    setFileError(null)
    setResult(null)
    setError(null)
    if (!file) return
    setFileName(file.name)
    if (file.size > IMPORT_MAX_CHARS * 3) return setFileError('That file is too big (1 MB at most). Split it in two.')
    const t = await file.text()
    setText(t)
    if (!listName) setListName(file.name.replace(/\.[^.]+$/, '').slice(0, 120))
    try {
      setPreview(prepareImport(t))
    } catch (err) {
      setFileError(err instanceof ImportFileError ? err.message : 'We couldn’t read that file.')
    }
  }
  const submit = (): void =>
    start(async () => {
      setError(null)
      const r = await importCsvToCallList({ text, ...(target === 'new' ? { newList: { name: listName.trim() || 'Imported list', ...(owner ? { ownerId: owner } : {}) } } : { listId: target }) })
      if (!r.ok) return setError(r.error)
      setResult(r.data)
      router.refresh()
    })

  const canSend = Boolean(preview?.rows.length) && !pending && (target !== 'new' || listName.trim().length > 0)
  return (
    <>
      <Button variant="outline" onClick={show}>
        <Upload className="mr-1.5 h-4 w-4" aria-hidden /> Import CSV
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Import a list from a CSV" description="One person per row. We need a phone column; name, company and website are optional.">
        {result ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-lg border border-success/30 bg-success/10 p-3">
              <b>{result.added}</b> {result.added === 1 ? 'person was' : 'people were'} added to <b>{result.listName}</b>.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {result.alreadyLead ? <li>{result.alreadyLead} already a lead, skipped.</li> : null}
              {result.alreadyOnList ? <li>{result.alreadyOnList} already on a call list, skipped.</li> : null}
              {result.duplicatesInFile ? <li>{result.duplicatesInFile} repeated in the file, skipped.</li> : null}
              {result.rejectedCount ? <li>{result.rejectedCount} without a usable number, skipped.</li> : null}
            </ul>
            {result.rejected.length ? (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">Which rows</summary>
                <ul className="mt-1 space-y-0.5">
                  {result.rejected.map((r) => (
                    <li key={r.line}>
                      Line {r.line}: {r.reason}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
              <Link href={`/sales/call-lists/${result.listId}`} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                Open the list
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="csv-file">CSV file</Label>
              <Input id="csv-file" ref={fileRef} type="file" accept=".csv,text/csv,text/plain" onChange={(e) => void onFile(e.target.files?.[0])} />
              <a className="text-xs text-primary underline" href={`data:text/csv;charset=utf-8,${encodeURIComponent(EXAMPLE_CSV)}`} download="call-list-example.csv">
                Download an example file
              </a>
            </div>
            {fileError ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{fileError}</p> : null}
            {preview ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p>
                  <b>{preview.rows.length}</b> {preview.rows.length === 1 ? 'person' : 'people'} with a number we can call, in <span className="text-muted-foreground">{fileName}</span>.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Columns used: phone “{preview.columns.phone}”{preview.columns.name ? `, name “${preview.columns.name}”` : ''}
                  {preview.columns.company ? `, company “${preview.columns.company}”` : ''}
                  {preview.columns.website ? `, website “${preview.columns.website}”` : ''}.
                </p>
                {preview.rejected.length || preview.duplicatesInFile ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Will be skipped: {preview.rejected.length} without a usable number{preview.duplicatesInFile ? `, ${preview.duplicatesInFile} repeated` : ''}. Numbers already in the CRM are skipped too.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">Numbers already in the CRM are skipped.</p>
                )}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="csv-target">Call list</Label>
              <Select id="csv-target" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="new">+ New list</option>
                {choices?.lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.owner ? ` (${l.owner})` : ''}
                  </option>
                ))}
              </Select>
            </div>
            {target === 'new' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="csv-name">List name</Label>
                  <Input id="csv-name" value={listName} maxLength={120} onChange={(e) => setListName(e.target.value)} />
                </div>
                {choices && choices.teammates.length ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="csv-owner">Who calls it</Label>
                    <Select id="csv-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
                      <option value="">Me</option>
                      {choices.teammates
                        .filter((t) => t.id !== choices.me)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}
            {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={!canSend}>
                {pending ? 'Importing…' : preview?.rows.length ? `Import ${preview.rows.length}` : 'Import'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
