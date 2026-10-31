import { SettingsForm } from '../_components/SettingsForm'
import { getSettings } from '@/lib/settings'
import { PageIntro } from '@/components/PageIntro'

export const metadata = { title: 'Settings' }

export default async function SettingsPage(): Promise<React.ReactElement> {
  return (
    <div className="space-y-6">
      <PageIntro title="Settings" hint="Company-wide options for emails, reminders and booking." />
      <SettingsForm initial={await getSettings()} />
    </div>
  )
}
