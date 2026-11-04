import { describe, expect, it } from 'vitest'
import { contactPageLinks, extractContacts, isPublicIp, visibleText } from '@/lib/site-scan'
import { allPhones, askFor, verifyContacts } from '@/lib/prospect-details'
import { prospectSummary } from '@/lib/call-lists'

const HOME = `<html><head><style>.x{}</style><script>var a="hidden@nope.com"</script></head><body>
<a href="/contact-us">צור קשר</a> <a href="/about">About</a> <a href="https://other.com/contact">elsewhere</a>
<a href="tel:+972-2-555-1234">Call</a> <a href="mailto:Office@Zion.co.il?subject=hi">mail</a>
<a href="https://wa.me/972501112233">WhatsApp</a>
<a href="https://www.facebook.com/zionrealty/">fb</a> <a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a>
<a href="https://instagram.com/zion.realty">ig</a> <img src="logo@2x.png">
<p>Dana Levi, owner &amp; broker: 052-987-6543 · dana@zion.co.il</p></body></html>`

describe('website scan', () => {
  it('never reaches private or internal addresses', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) expect(isPublicIp(ip)).toBe(false)
    for (const ip of ['8.8.8.8', '151.101.1.1', '2606:4700::1111']) expect(isPublicIp(ip)).toBe(true)
  })

  it('pulls phones, emails, WhatsApp and social pages', () => {
    const r = extractContacts([{ url: 'https://zion.co.il/', html: HOME }])
    expect(r.phones).toEqual(expect.arrayContaining(['+97225551234', '+972529876543']))
    expect(r.emails).toEqual(expect.arrayContaining(['office@zion.co.il', 'dana@zion.co.il']))
    expect(r.emails).not.toContain('hidden@nope.com')
    expect(r.emails.some((e) => e.includes('2x.png'))).toBe(false)
    expect(r.whatsapp).toEqual(['+972501112233'])
    expect(r.socials).toEqual([
      { kind: 'facebook', url: 'https://www.facebook.com/zionrealty' },
      { kind: 'instagram', url: 'https://instagram.com/zion.realty' },
    ])
    expect(visibleText(HOME)).toContain('Dana Levi, owner & broker')
  })

  it('follows only same-site contact / about pages', () => {
    expect(contactPageLinks({ url: 'https://zion.co.il/', html: HOME })).toEqual(['https://zion.co.il/contact-us', 'https://zion.co.il/about'])
  })

  it('keeps only AI contacts the site really shows', () => {
    const site = { phones: ['+972529876543'], emails: ['dana@zion.co.il'], whatsapp: [], socials: [], pages: [], text: visibleText(HOME) }
    const out = verifyContacts(
      [
        { name: 'Dana Levi', role: 'Owner', phone: '052-987-6543', email: 'dana@zion.co.il' },
        { name: 'Dana Levi', role: 'Owner', phone: '054-000-0000', email: 'made@up.com' },
        { name: 'Moshe Cohen', role: 'Agent', phone: null, email: null },
      ],
      site,
    )
    expect(out).toEqual([
      { name: 'Dana Levi', role: 'Owner', phone: '+972529876543', email: 'dana@zion.co.il' },
      { name: 'Dana Levi', role: 'Owner', phone: null, email: null },
    ])
  })

  it('lists every number once, main first, and summarises for the lead', () => {
    const d = { contacts: [{ name: 'Dana Levi', role: 'Owner', phone: '+972529876543', email: null }], whatsapp: ['+972501112233'], phones: ['+972529876543', '+97225551234'], emails: ['office@zion.co.il'], hours: ['Sunday: 9–17'] }
    expect(allPhones('+972 2-555-1234', d).map((p) => [p.e164, p.label])).toEqual([
      ['+97225551234', 'Google'],
      ['+972529876543', 'Dana Levi'],
      ['+972501112233', 'WhatsApp'],
    ])
    expect(askFor(d)).toBe('Dana Levi (Owner)')
    const text = prospectSummary({ name: 'Zion', category: 'Real estate agency', address: 'Jaffa St 1', rating: 4.6, reviews: 31, mapsUrl: null, list: { name: 'RE' } }, d)
    expect(text).toContain('Contact: Dana Levi · Owner')
    expect(text).toContain('Emails: office@zion.co.il')
    expect(text).toContain('Hours:\nSunday: 9–17')
  })
})
