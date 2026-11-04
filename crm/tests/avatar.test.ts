import { render } from '@react-email/render'
import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { ContactEmail } from '@/emails/ContactEmail'
import { BookingInvite } from '@/emails/BookingInvite'
import { avatarEmailUrl, avatarPath, googlePhotoAtSize, isGooglePhoto } from '@/lib/avatar'

const PHOTO = 'https://lh3.googleusercontent.com/a/ACg8ocK123abc=s96-c'

describe('profile photos', () => {
  it('only uses Google photo URLs, at a crisp size', () => {
    expect(isGooglePhoto(PHOTO)).toBe(true)
    for (const bad of ['http://lh3.googleusercontent.com/a/x', 'https://evil.com/a.png', 'https://lh3.googleusercontent.com.evil.com/x', null, '']) expect(isGooglePhoto(bad)).toBe(false)
    expect(googlePhotoAtSize(PHOTO)).toBe('https://lh3.googleusercontent.com/a/ACg8ocK123abc=s256-c')
    expect(googlePhotoAtSize('https://lh3.googleusercontent.com/a/xyz')).toBe('https://lh3.googleusercontent.com/a/xyz=s256-c')
  })

  it('links to our cached copy, versioned so a new photo shows at once', () => {
    const a = avatarPath({ id: 'cabc123', image: PHOTO })!
    const b = avatarPath({ id: 'cabc123', image: PHOTO.replace('123', '456') })!
    expect(a).toMatch(/^\/api\/public\/avatar\/cabc123\?v=[0-9a-f]{10}$/)
    expect(a).not.toBe(b)
    expect(avatarPath({ id: 'cabc123', image: null })).toBeNull()
    expect(avatarEmailUrl({ id: 'cabc123', image: PHOTO })).toMatch(/^https:\/\/[^/]+\/api\/public\/avatar\/cabc123\?v=/)
    expect(avatarEmailUrl({ id: 'cabc123', image: PHOTO })).not.toContain('localhost')
  })

  it('emails show the sender photo, or initials without one', async () => {
    const photo = 'https://app.igani.co/api/public/avatar/cabc123?v=1234567890'
    const withPhoto = await render(React.createElement(ContactEmail, { subject: 'Hi', body: 'Hello', senderName: 'Gabriel', senderEmail: 'g@igani.co', senderPhotoUrl: photo, logoUrl: 'https://app.igani.co/l.png' }))
    expect(withPhoto).toContain(`src="${photo}"`)
    expect(withPhoto).toMatch(/width="40"/)
    const without = await render(React.createElement(ContactEmail, { subject: 'Hi', body: 'Hello', senderName: 'Gabriel', senderEmail: 'g@igani.co', logoUrl: 'https://app.igani.co/l.png' }))
    expect(without).not.toContain('/api/public/avatar/')
    const invite = await render(React.createElement(BookingInvite, { hostName: 'Ann', hostPhotoUrl: photo, guestName: 'Bo', title: 'Intro', startTime: new Date(), endTime: new Date(), timeZone: 'UTC', acceptUrl: 'https://x' } as never))
    expect(invite).toContain(`src="${photo}"`)
  })
})
