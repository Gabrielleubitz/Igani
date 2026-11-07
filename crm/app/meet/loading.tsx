import { MeetLoader } from '@/components/meet/MeetLoader'

/** Between Meet pages (home, sign-in, a call): the Igani Meet loader on Meet's own background. */
export default function MeetLoading(): React.ReactElement {
  return (
    <div className="dark fixed inset-0 flex items-center justify-center bg-[#0e1626] text-white">
      <MeetLoader steps={['Opening Igani Meet']} />
    </div>
  )
}
