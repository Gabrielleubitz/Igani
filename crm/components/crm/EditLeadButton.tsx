'use client'

import { Pencil } from 'lucide-react'
import { useState } from 'react'
import { EditContactForm } from '@/components/crm/EditContactForm'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

type Props = React.ComponentProps<typeof EditContactForm> & { name: string; variant?: 'header' | 'card' }

/** "Edit" on the contact page: the contact's details in a dialog (name, phone, email for admins, company, site, budget, source, tags). */
export function EditLeadButton({ name, variant = 'header', ...form }: Props): React.ReactElement {
  const [open, setOpen] = useState(false)
  return (
    <>
      {variant === 'header' ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4" /> Edit details
        </Button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-primary transition hover:bg-primary/10">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={`Edit ${name}`} description="Changes are saved to the contact and noted on its timeline." className="max-w-lg">
        <EditContactForm {...form} onSaved={() => setOpen(false)} />
      </Dialog>
    </>
  )
}
