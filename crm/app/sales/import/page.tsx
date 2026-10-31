import Link from 'next/link'
import { LeadImport } from '@/components/crm/LeadImport'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'

export const metadata = { title: 'Import contacts' }

const TEMPLATE = 'data:text/csv;charset=utf-8,' + encodeURIComponent('email,first name,last name,phone,company,website,budget,lead source,source detail,message\r\ndana@acme.com,Dana,Levi,+972 50 000 0000,Acme,acme.com,$5k,Referral,Referred by Noa,Wants a new website\r\n')

export default async function ImportPage(): Promise<React.ReactElement> {
  await requireUser()
  return (
    <div className="space-y-5">
      <Link href="/sales/leads" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← Contacts
      </Link>
      <PageIntro title="Import contacts" hint="Upload a spreadsheet saved as CSV. You'll see a preview (new vs. already in the CRM) before anything is saved." />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>
              Start from our{' '}
              <a href={TEMPLATE} download="igani-contacts-template.csv" className="font-medium text-primary underline-offset-4 hover:underline">
                CSV template
              </a>{' '}
              or export from Excel / Google Sheets as <em>CSV</em>.
            </li>
            <li>Each row needs an <strong className="text-foreground">email or a phone</strong>. Other recognised columns: first name, last name, company, website, message, budget, lead source, source detail.</li>
            <li>Choose the file, check the preview, then press Import. Up to 2,000 rows at a time.</li>
          </ol>
          <LeadImport />
        </CardContent>
      </Card>
    </div>
  )
}
