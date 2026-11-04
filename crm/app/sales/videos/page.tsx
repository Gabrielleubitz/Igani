import { PrivateVideo } from '@/components/PrivateVideo'
import { PageIntro } from '@/components/PageIntro'
import { requireUser } from '@/lib/auth'
import { listVideos } from '@/lib/video'

export const metadata = { title: 'Videos' }
export const dynamic = 'force-dynamic'

/** Team videos for every signed-in teammate. */
export default async function TeamVideosPage(): Promise<React.ReactElement> {
  await requireUser()
  const videos = (await listVideos()).filter((v) => v.visibility === 'team')
  return (
    <div className="space-y-5">
      <PageIntro title="Videos" hint="Internal videos for the team. They only play while you are signed in." />
      {videos.length === 0 ? <p className="text-sm text-muted-foreground">No videos yet.</p> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        {videos.map((v) => (
          <PrivateVideo key={v.id} id={v.id} title={v.title} />
        ))}
      </div>
    </div>
  )
}
