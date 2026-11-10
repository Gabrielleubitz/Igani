import { appUrl } from '@/lib/env'
import { json, mobileUser } from '@/lib/mobile'
import { listVideos } from '@/lib/video'
import { hasRecentAck } from '@/lib/video-ack'
import { ACK_TEXT, needsAck } from '@/lib/video-ack-core'
import { courseOrder } from '@/lib/video-core'
import { unlockedFor } from '@/lib/video-progress'

export const dynamic = 'force-dynamic'

/**
 * Control of the call for the app. Salespeople get the course (in order, each unlocked by finishing the one before);
 * admins and marketing see every team video. Internal videos ask non-admins to confirm confidentiality first.
 */
export async function GET(): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const course = user.role === 'SALES' ? await unlockedFor(user.id) : null
  const videos = course ? course.ordered : courseOrder(await listVideos()).filter((v) => v.visibility === 'team')
  const rows = await Promise.all(
    videos.map(async (v) => {
      const gated = needsAck(user.role, v.visibility)
      return {
        id: v.id,
        title: v.title,
        stream: appUrl(`/api/public/videos/${v.id}/stream`),
        locked: course ? !course.unlocked.includes(v.id) : false,
        done: course ? course.progress.completed.includes(v.id) : false,
        needsAck: gated && !(await hasRecentAck(user.id, v.id)),
      }
    }),
  )
  return json({ course: Boolean(course), ack: ACK_TEXT, videos: rows })
}
