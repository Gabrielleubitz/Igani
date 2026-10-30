import { SettingsForm } from '../_components/SettingsForm'
import { getSettings } from '@/lib/settings'

export const metadata = { title: 'Settings' }

export default async function SettingsPage(): Promise<React.ReactElement> {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsForm initial={await getSettings()} />
    </div>
  )
}
