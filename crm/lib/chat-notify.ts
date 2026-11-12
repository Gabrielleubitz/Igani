import type { PushMessage } from './push'

/**
 * Who hears about a team-chat message, and what their phone shows. Pure (no database): the action collects the
 * channel's members and the thread's people, this decides. The web notifier (chatPulse) follows the same rules in SQL
 * (chatNewestFor in lib/chat.ts).
 *
 * Rules, like Slack with "all new messages" on:
 *   - a direct message reaches the other person
 *   - an @mention reaches whoever was named, muted channel or not (in a private channel only if they're a member)
 *   - a thread reply reaches the thread's starter and everyone who replied in it
 *   - a channel message reaches every member who hasn't muted the channel
 *   - never the sender
 */

/** The Igani chat sound in the iPhone app's bundle (Resources/igani-chat.caf): the same chime the web CRM plays. */
export const CHAT_SOUND = 'igani-chat.caf'

export type ChatReason = 'dm' | 'mention' | 'thread' | 'channel'

export interface ChatChannelLite {
  id: string
  kind: 'CHANNEL' | 'DM'
  name: string
  private: boolean
}

export interface ChatRecipientsInput {
  channel: ChatChannelLite
  senderId: string
  /** the message as stored (mentions as <@userId>) */
  body: string
  members: { userId: string; muted: boolean }[]
  /** user ids mentioned in the body (lib/chat's mentionsIn) */
  mentioned: string[]
  /** a thread reply: the thread's starter and everyone who has replied in it (null entries = deleted teammates) */
  thread: { threadId: string; people: (string | null)[] } | null
}

/** Why someone gets it, the strongest reason first (a mention beats a muted channel). */
const PRIORITY: ChatReason[] = ['mention', 'dm', 'thread', 'channel']

export function chatRecipients(i: ChatRecipientsInput): { userId: string; reason: ChatReason }[] {
  const memberIds = new Set(i.members.map((m) => m.userId))
  const muted = new Set(i.members.filter((m) => m.muted).map((m) => m.userId))
  const reasons = new Map<string, ChatReason>()
  const add = (userId: string | null | undefined, reason: ChatReason): void => {
    if (!userId || userId === i.senderId) return
    const have = reasons.get(userId)
    if (!have || PRIORITY.indexOf(reason) < PRIORITY.indexOf(have)) reasons.set(userId, reason)
  }
  if (i.thread) {
    for (const u of i.thread.people) if (!muted.has(u ?? '')) add(u, 'thread')
  } else {
    for (const m of i.members) if (!muted.has(m.userId)) add(m.userId, i.channel.kind === 'DM' ? 'dm' : 'channel')
  }
  for (const u of i.mentioned) if (!i.channel.private || memberIds.has(u)) add(u, 'mention')
  return [...reasons].map(([userId, reason]) => ({ userId, reason }))
}

export interface ChatPushInput {
  channel: ChatChannelLite
  thread: { threadId: string } | null
  sender: { id: string; name: string | null; photo: string | null }
  /** the message with mentions already drawn as @Name, or the file line for a file-only message */
  text: string
}

/** The notification itself: the sender as the title, where it was said as the subtitle, grouped by conversation. */
export function chatPushMessage(i: ChatPushInput): PushMessage {
  const { channel, thread, sender } = i
  const subtitle = channel.kind === 'CHANNEL' ? (thread ? `Thread in #${channel.name}` : `#${channel.name}`) : thread ? 'Thread' : null
  return {
    title: sender.name ?? 'Team chat',
    ...(subtitle ? { subtitle } : {}),
    body: i.text,
    sound: CHAT_SOUND,
    thread: `chat-${channel.id}`,
    category: 'CHAT',
    data: { type: 'chat', channelId: channel.id, threadId: thread?.threadId ?? null, channel: channel.kind === 'DM' ? null : channel.name, dm: channel.kind === 'DM', senderId: sender.id, senderName: sender.name, senderPhoto: sender.photo },
  }
}
