import { describe, expect, it } from 'vitest'
import { PLAY_LINK_SECONDS, decideAccess } from '../lib/video-access-core'
import type { VideoRecord } from '../lib/video-core'

const team: VideoRecord = { id: 'abc12345', title: 'Demo', pathname: 'videos/demo.mp4', size: 1000, contentType: 'video/mp4', visibility: 'team', offerId: null, createdAt: '' }
const offerVideo: VideoRecord = { ...team, visibility: 'offer', offerId: 'o1' }

describe('who may get a play link', () => {
  it('refuses strangers, and a salesperson whose lesson is still locked', () => {
    expect(decideAccess({ video: team, viewer: null, offer: null, acked: true })).toBe('deny')
    expect(decideAccess({ video: team, viewer: { role: 'SALES', unlocked: ['other123'] }, offer: null, acked: true })).toBe('deny')
  })
  it('asks an unlocked salesperson for the confidentiality confirmation first', () => {
    const viewer = { role: 'SALES' as const, unlocked: ['abc12345'] }
    expect(decideAccess({ video: team, viewer, offer: null, acked: false })).toBe('confirmation_required')
    expect(decideAccess({ video: team, viewer, offer: null, acked: true })).toBe('ok')
  })
  it('never asks admins, and lets them watch everything', () => {
    expect(decideAccess({ video: team, viewer: { role: 'ADMIN' }, offer: null, acked: false })).toBe('ok')
    expect(decideAccess({ video: offerVideo, viewer: { role: 'ADMIN' }, offer: null, acked: false })).toBe('ok')
  })
  it('lets a visitor watch an offer video only on its own live offer, without any confirmation', () => {
    expect(decideAccess({ video: offerVideo, viewer: null, offer: { id: 'o1', status: 'LIVE' }, acked: false })).toBe('ok')
    expect(decideAccess({ video: offerVideo, viewer: null, offer: { id: 'o2', status: 'LIVE' }, acked: false })).toBe('deny')
    expect(decideAccess({ video: offerVideo, viewer: null, offer: { id: 'o1', status: 'DRAFT' }, acked: false })).toBe('deny')
  })
  it('gives a play link long enough for a lesson but not for days', () => {
    expect(PLAY_LINK_SECONDS).toBe(1800)
  })
})
