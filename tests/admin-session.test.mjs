// Run: node --test tests/admin-session.test.mjs  (Node 22.6+ strips the TS types)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { adminApiNeedsSession, createAdminToken, verifyAdminToken } from '../lib/admin-session.ts'

test('valid token verifies; tampered, wrong secret and expired do not', async () => {
  const now = 1_800_000_000_000
  const t = await createAdminToken('s3cret', now)
  assert.equal(await verifyAdminToken(t, 's3cret', now + 1000), true)
  assert.equal(await verifyAdminToken(t, 'other', now), false)
  assert.equal(await verifyAdminToken(t.replace(/.$/, (c) => (c === '0' ? '1' : '0')), 's3cret', now), false)
  assert.equal(await verifyAdminToken(t, 's3cret', now + 13 * 3600_000), false)
  const [, sig] = t.split('.')
  assert.equal(await verifyAdminToken(`${now + 10 * 365 * 86400_000}.${sig}`, 's3cret', now), false)
  assert.equal(await verifyAdminToken('', 's3cret', now), false)
  assert.equal(await verifyAdminToken(t, '', now), false)
  assert.equal(await verifyAdminToken('true', 's3cret', now), false)
})

test('which admin APIs need the session cookie', () => {
  assert.equal(adminApiNeedsSession('/api/admin/api-keys', 'GET'), true)
  assert.equal(adminApiNeedsSession('/api/admin/api-keys', 'POST'), true)
  assert.equal(adminApiNeedsSession('/api/admin/api-keys/abc', 'DELETE'), true)
  assert.equal(adminApiNeedsSession('/api/admin/upload', 'POST'), true)
  assert.equal(adminApiNeedsSession('/api/admin/test-email', 'POST'), true)
  assert.equal(adminApiNeedsSession('/api/admin/analytics/summary', 'GET'), true)
  assert.equal(adminApiNeedsSession('/api/admin/site-settings', 'POST'), true)
  assert.equal(adminApiNeedsSession('/api/admin/offer-settings', 'POST'), true)
  assert.equal(adminApiNeedsSession('/api/admin/site-settings', 'GET'), false)
  assert.equal(adminApiNeedsSession('/api/admin/offer-settings', 'GET'), false)
  assert.equal(adminApiNeedsSession('/api/admin/session', 'POST'), false)
  assert.equal(adminApiNeedsSession('/api/admin/projects', 'POST'), false)
  assert.equal(adminApiNeedsSession('/api/admin/crm-sync', 'POST'), false)
  assert.equal(adminApiNeedsSession('/api/admin/vercel', 'POST'), false)
  assert.equal(adminApiNeedsSession('/api/admin/sessionx', 'POST'), true)
  assert.equal(adminApiNeedsSession('/api/contact', 'POST'), false)
})
