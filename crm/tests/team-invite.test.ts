import { render } from '@react-email/render'
import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { TeamInvite } from '@/emails/TeamInvite'

describe('welcome / invite email', () => {
  for (const role of ['ADMIN', 'SALES', 'MARKETING']) {
    it(`has no "set your working hours" step (${role})`, async () => {
      const html = await render(React.createElement(TeamInvite, { role, inviterName: 'Ilan', loginUrl: 'https://app.igani.co/login?invite=x', logoUrl: 'https://app.igani.co/logo.png' }))
      expect(html).not.toMatch(/working hours/i)
      expect(html).toContain('Sign in with Google')
      expect(html).toContain('Open Today')
    })
  }
})
