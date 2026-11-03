import { requireUser } from '@/lib/auth'
import { SettingsForm } from '../_components/SettingsForm'
import { getSettings } from '@/lib/settings'
import { PageIntro } from '@/components/PageIntro'
import { ContractSignerCard } from '@/components/admin/ContractSignerCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Settings' }

export default async function SettingsPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const settings = await getSettings()
  return (
    <div className="space-y-6">
      <PageIntro title="Settings" hint="Company-wide options for emails, reminders and booking." />
      <SettingsForm initial={settings} />
      <Card id="contract-signer" className="scroll-mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contract signer (Igani)</CardTitle>
          <p className="text-sm text-muted-foreground">Who signs contracts for Igani. Approving a contract signs it with this signature; the client signs last.</p>
        </CardHeader>
        <CardContent>
          <ContractSignerCard initial={settings['contract.signer']} signature={settings['contract.signature']} />
        </CardContent>
      </Card>
    </div>
  )
}
