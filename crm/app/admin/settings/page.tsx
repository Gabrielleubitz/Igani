import { requireUser } from '@/lib/auth'
import { SettingsForm } from '../_components/SettingsForm'
import { getSettings } from '@/lib/settings'
import { PageIntro } from '@/components/PageIntro'
import { SignaturesCard } from '@/components/admin/SignaturesCard'
import { listSignatures, signatureAdmins } from '@/lib/signatures'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TikTokCard } from '@/components/admin/TikTokCard'
import { tiktokConfig, tiktokStatus } from '@/lib/tiktok'
import { InstagramCard } from '@/components/admin/InstagramCard'
import { instagramConfig, instagramStatus } from '@/lib/instagram'

export const metadata = { title: 'Settings' }
export const maxDuration = 120 // "Post now" on TikTok sends the test video from this page's server action

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tiktok?: string; instagram?: string }> }): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const [settings, signatures, admins, tiktok, instagram, sp] = await Promise.all([getSettings(), listSignatures(), signatureAdmins(), tiktokStatus(), instagramStatus(), searchParams])
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
      <Card id="tiktok" className="scroll-mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">TikTok</CardTitle>
          <p className="text-sm text-muted-foreground">Igani’s own TikTok account. The reel job uploads finished videos to its drafts; you publish them from the TikTok app.</p>
        </CardHeader>
        <CardContent>
          <TikTokCard status={tiktok} configured={Boolean(tiktokConfig())} message={sp.tiktok ?? null} />
        </CardContent>
      </Card>
      <Card id="instagram" className="scroll-mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Instagram</CardTitle>
          <p className="text-sm text-muted-foreground">Igani’s own Instagram (professional) account. Reels from the reel job wait on the Reels page and post only when an admin approves them.</p>
        </CardHeader>
        <CardContent>
          <InstagramCard status={instagram} configured={Boolean(instagramConfig())} message={sp.instagram ?? null} />
        </CardContent>
      </Card>
    </div>
  )
}
