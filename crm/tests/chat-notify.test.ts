import { describe, expect, it } from 'vitest'
import { CHAT_SOUND, chatPushMessage, chatRecipients } from '@/lib/chat-notify'

const A = 'a'.repeat(25)
const B = 'b'.repeat(25)
const C = 'c'.repeat(25)
const D = 'd'.repeat(25)
const general = { id: 'ch'.repeat(12), kind: 'CHANNEL' as const, name: 'general', private: false }
const secret = { ...general, name: 'leads', private: true }
const dm = { id: 'dm'.repeat(12), kind: 'DM' as const, name: '', private: true }
const members = (...m: [string, boolean][]) => m.map(([userId, muted]) => ({ userId, muted }))
const who = (r: { userId: string; reason: string }[]) => Object.fromEntries(r.map((x) => [x.userId, x.reason]))

describe('who hears about a chat message', () => {
  it('a direct message reaches the other person, never the sender', () => {
    expect(who(chatRecipients({ channel: dm, senderId: A, body: 'hi', members: members([A, false], [B, false]), mentioned: [], thread: null }))).toEqual({ [B]: 'dm' })
  })

  it('a channel message reaches every member who has not muted it', () => {
    expect(who(chatRecipients({ channel: general, senderId: A, body: 'hello all', members: members([A, false], [B, false], [C, true]), mentioned: [], thread: null }))).toEqual({ [B]: 'channel' })
  })

  it('an @mention cuts through a mute, and wins over the channel reason', () => {
    const r = chatRecipients({ channel: general, senderId: A, body: `<@${C}> <@${B}> look`, members: members([A, false], [B, false], [C, true]), mentioned: [C, B], thread: null })
    expect(who(r)).toEqual({ [B]: 'mention', [C]: 'mention' })
  })

  it('mentions in a private channel only reach its members; in a public one, anyone on the team', () => {
    expect(who(chatRecipients({ channel: secret, senderId: A, body: `<@${D}>`, members: members([A, false], [B, false]), mentioned: [D], thread: null }))).toEqual({ [B]: 'channel' })
    expect(who(chatRecipients({ channel: general, senderId: A, body: `<@${D}>`, members: members([A, false], [B, false]), mentioned: [D], thread: null }))).toEqual({ [B]: 'channel', [D]: 'mention' })
  })

  it('a thread reply reaches the thread (starter and repliers), not the whole channel, and not muted people', () => {
    const r = chatRecipients({ channel: general, senderId: A, body: 'reply', members: members([A, false], [B, false], [C, true], [D, false]), mentioned: [], thread: { threadId: 'th'.repeat(12), people: [B, C, A, null] } })
    expect(who(r)).toEqual({ [B]: 'thread' })
  })

  it('a muted DM stays quiet, and mentioning yourself does nothing', () => {
    expect(chatRecipients({ channel: dm, senderId: A, body: `<@${A}>`, members: members([A, false], [B, true]), mentioned: [A], thread: null })).toEqual([])
  })
})

describe('the chat push', () => {
  const sender = { id: A, name: 'Dana Cohen', photo: 'https://app.igani.co/api/public/avatar/x' }

  it('carries the Igani chime, groups by conversation, and opens the thread it came from', () => {
    const m = chatPushMessage({ channel: general, thread: { threadId: 'th'.repeat(12) }, sender, text: 'on it @Gabriel' })
    expect(m).toMatchObject({ title: 'Dana Cohen', subtitle: 'Thread in #general', body: 'on it @Gabriel', sound: CHAT_SOUND, thread: `chat-${general.id}`, category: 'CHAT' })
    expect(m.data).toMatchObject({ type: 'chat', channelId: general.id, threadId: 'th'.repeat(12), channel: 'general', dm: false, senderId: A, senderName: 'Dana Cohen', senderPhoto: sender.photo })
    expect(CHAT_SOUND).toMatch(/\.caf$/)
  })

  it('a direct message has no subtitle and no channel name', () => {
    const m = chatPushMessage({ channel: dm, thread: null, sender: { ...sender, name: null, photo: null }, text: 'hey' })
    expect(m.title).toBe('Team chat')
    expect(m).not.toHaveProperty('subtitle')
    expect(m.data).toMatchObject({ channel: null, dm: true, threadId: null, senderPhoto: null })
    expect(chatPushMessage({ channel: dm, thread: { threadId: 'th'.repeat(12) }, sender, text: 'hey' }).subtitle).toBe('Thread')
  })
})
