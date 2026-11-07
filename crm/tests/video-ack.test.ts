import { describe, expect, it } from 'vitest'
import { ACK_WINDOW_MS, ackIsValid, needsAck } from '../lib/video-ack-core'

describe('confidentiality notice before internal videos', () => {
  it('asks salespeople and marketing, never admins, and only for internal videos', () => {
    expect(needsAck('SALES', 'team')).toBe(true)
    expect(needsAck('MARKETING', 'team')).toBe(true)
    expect(needsAck('ADMIN', 'team')).toBe(false)
    expect(needsAck('SALES', 'offer')).toBe(false)
    expect(needsAck(null, 'team')).toBe(false)
  })
  const now = new Date('2026-11-25T12:00:00Z')
  it('accepts a recent confirmation and rejects missing, old or future ones', () => {
    expect(ackIsValid(null, now)).toBe(false)
    expect(ackIsValid(undefined, now)).toBe(false)
    expect(ackIsValid(new Date(now.getTime() - 60_000), now)).toBe(true)
    expect(ackIsValid(new Date(now.getTime() - ACK_WINDOW_MS), now)).toBe(true)
    expect(ackIsValid(new Date(now.getTime() - ACK_WINDOW_MS - 1), now)).toBe(false)
    expect(ackIsValid(new Date(now.getTime() + 60_000), now)).toBe(false)
  })
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConfidentialityGate } from '../components/ConfidentialityGate'

describe('the notice component', () => {
  const child = createElement('video', { 'data-testid': 'player' })
  it('covers the video with the notice and does not render it until confirmed', () => {
    // eslint-disable-next-line react/no-children-prop
    const html = renderToStaticMarkup(createElement(ConfidentialityGate, { videoId: 'abcdefgh1', enabled: true, children: child }))
    expect(html).toContain('Confidential')
    expect(html).toContain('will not download, record, copy or share it')
    expect(html).toContain('I confirm and start the video')
    expect(html).not.toContain('<video')
  })
  it('shows the video straight away when not enabled (admins, customer videos)', () => {
    // eslint-disable-next-line react/no-children-prop
    const html = renderToStaticMarkup(createElement(ConfidentialityGate, { videoId: 'abcdefgh1', enabled: false, children: child }))
    expect(html).toContain('<video')
    expect(html).not.toContain('Confidential')
  })
})
