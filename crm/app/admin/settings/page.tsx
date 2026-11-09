import { requireUser } from '@/lib/auth'
import { SettingsForm } from '../_components/SettingsForm'
import { getSettings } from '@/lib/settings'
import { PageIntro } from '@/components/PageIntro'
import { SignaturesCard } from '@/components/admin/SignaturesCard'
import { listSignatures, signatureAdmins } from '@/lib/signatures'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Settings' }

export default async function SettingsPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const [settings, signatures, admins] = await Promise.all([getSettings(), listSignatures(), signatureAdmins()])
  return (
    <div className="space-y-6">
      <PageIntro title="Settings" hint="Company-wide options for emails, reminders and booking." />
      <SettingsForm initial={settings} />
      <Card id="signatures" className="scroll-mt-6">
        <span id="contract-signer" className="block -translate-y-6" aria-hidden />
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Signatures</CardTitle>
          <p className="text-sm text-muted-foreground">Each admin's signature, with their name and email from their profile. Sales contracts and offer contracts let you pick one when signing; the default is picked for you. A signed contract keeps the signature it was signed with, even if you edit or delete it here.</p>
        </CardHeader>
        <CardContent>
          <SignaturesCard signatures={signatures} admins={admins} />
        </CardContent>
      </Card>
    </div>
  )
}
