import { describe, expect, it } from 'vitest'
import { analyzeSite, compareVersions, detectPlatform, phpEnded, phpVersion, tamperSigns, wpPlugins } from '@/lib/site-audit-core'
import { normalizeSiteUrl } from '@/lib/site-audit'

const NOW = new Date('2026-11-05T10:00:00Z')
const base = { url: 'https://example.co.il/', status: 200, headers: {} as Record<string, string>, ms: 900, now: NOW }
const good = '<html><head><title>Acme</title><meta name="viewport" content="width=device-width"><meta name="description" content="We help people sell homes quickly and calmly."></head><body><h1>Acme</h1><a href="tel:021234567">Call</a></body></html>'

describe('site check: platform', () => {
  it('detects WordPress and its version', () => {
    const p = detectPlatform('<meta name="generator" content="WordPress 5.8.1" /><link href="/wp-content/themes/x/s.css">', {})
    expect(p).toMatchObject({ name: 'WordPress', version: '5.8.1', kind: 'wordpress' })
  })
  it('detects hosted builders', () => {
    expect(detectPlatform('<img src="https://static.wixstatic.com/a.png">', {}).name).toBe('Wix')
    expect(detectPlatform('<script src="https://cdn.shopify.com/x.js">', {}).kind).toBe('hosted')
  })
  it('compares versions numerically', () => {
    expect(compareVersions('5.8.1', '6.9')).toBe(-1)
    expect(compareVersions('6.10', '6.9')).toBe(1)
    expect(compareVersions('6.9', '6.9.0')).toBe(0)
  })
})

describe('site check: PHP', () => {
  it('reads the version from the header', () => expect(phpVersion({ 'x-powered-by': 'PHP/7.4.33' })).toBe('7.4.33'))
  it('knows which lines no longer get security fixes (relative to the date)', () => {
    expect(phpEnded('7.4.33', NOW)).toBe(true)
    expect(phpEnded('8.0.1', NOW)).toBe(true)
    expect(phpEnded('8.1.2', NOW)).toBe(true)
    expect(phpEnded('8.2.5', NOW)).toBe(false)
    expect(phpEnded('8.3.0', NOW)).toBe(false)
    expect(phpEnded('8.9.0', NOW)).toBeNull()
  })
})

describe('site check: signs of tampering', () => {
  it('flags scrambled scripts, hidden frames and hidden link farms', () => {
    const html = '<script>eval(function(p,a,c,k,e,d){return p}("x"))</script><iframe src="http://bad.example" width="1" height="1"></iframe><div style="position:absolute;left:-9999px"><a href="a">1</a><a href="b">2</a><a href="c">3</a></div>'
    expect(tamperSigns(html, 'example.co.il').length).toBe(3)
  })
  it('flags spam words and odd outside scripts', () => {
    const t = tamperSigns('<p>Buy cheap viagra</p><script src="https://a1b2.xyz/x.js"></script>', 'example.co.il').map((x) => x.what).join(' ')
    expect(t).toMatch(/viagra/)
    expect(t).toMatch(/a1b2\.xyz/)
  })
  it('does not mistake a normal-sized frame or a profile link for trouble', () => {
    expect(tamperSigns('<iframe src="https://www.youtube.com/embed/x" width="100%" height="100"></iframe><iframe width="1000" height="150"></iframe>', 'example.co.il')).toEqual([])
  })
  it('ignores the standard Google Tag Manager frame', () => {
    expect(tamperSigns('<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-X" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>', 'example.co.il')).toEqual([])
  })
  it('leaves a clean page alone', () => expect(tamperSigns(good, 'example.co.il')).toEqual([]))
  it('flags a redirect to another site but not to the same one', () => {
    expect(tamperSigns('<meta http-equiv="refresh" content="0;url=https://evil.example/">', 'example.co.il').length).toBe(1)
    expect(tamperSigns('<meta http-equiv="refresh" content="0;url=https://www.example.co.il/home">', 'example.co.il').length).toBe(0)
  })
})

describe('site check: report', () => {
  it('lists old WordPress, public usernames, old PHP and gives an opener', () => {
    const html = good.replace('<head>', '<head><meta name="generator" content="WordPress 5.8.1">') + '<link href="/wp-content/plugins/elementor-pro/a.css?ver=3.1">'
    const r = analyzeSite({ ...base, html, headers: { 'x-powered-by': 'PHP/7.4.3' }, wp: { readme: true, xmlrpc: true, users: ['admin'], latest: '6.9' } })
    const ids = r.findings.map((f) => f.id)
    expect(ids).toEqual(expect.arrayContaining(['wp-old', 'wp-users', 'wp-xmlrpc', 'wp-readme', 'php-old', 'cost-paid-plugins']))
    expect(r.findings.find((f) => f.id === 'wp-users')?.level).toBe('high')
    expect(r.findings[0]!.level).toBe('high')
    expect(r.opener).toBeTruthy()
  })
  it('rates WordPress by how far behind it is', () => {
    const wp = (v: string, latest: string) => analyzeSite({ ...base, html: good.replace('<head>', `<head><meta name="generator" content="WordPress ${v}">`) + '/wp-content/', wp: { readme: false, xmlrpc: false, users: [], latest } }).findings.find((f) => f.id === 'wp-old')?.level
    expect(wp('5.8.1', '7.2')).toBe('high')
    expect(wp('6.9.11', '7.2')).toBe('medium')
    expect(wp('6.4', '6.9')).toBe('high')
    expect(wp('6.8.1', '6.9')).toBe('medium')
  })
  it('does not call a link tag mixed content', () => {
    const r = analyzeSite({ ...base, html: good.replace('<head>', '<head><link rel="profile" href="http://gmpg.org/xfn/11">') })
    expect(r.findings.some((f) => f.id === 'mixed')).toBe(false)
  })
  it('does not call a current WordPress old', () => {
    const r = analyzeSite({ ...base, html: good.replace('<head>', '<head><meta name="generator" content="WordPress 6.9">') + '/wp-content/', wp: { readme: false, xmlrpc: false, users: [], latest: '6.9' } })
    expect(r.findings.some((f) => f.id === 'wp-old')).toBe(false)
    expect(r.findings.some((f) => f.id === 'wp-current')).toBe(true)
  })
  it('flags a monthly platform as a cost', () => {
    const r = analyzeSite({ ...base, html: good + '<img src="https://static.wixstatic.com/x.png">' })
    expect(r.findings.find((f) => f.id === 'cost-platform')?.say).toMatch(/Wix/)
  })
  it('flags basics: no HTTPS, slow, no viewport, no contact', () => {
    const r = analyzeSite({ ...base, url: 'http://example.co.il/', ms: 7000, html: '<html><body><p>hi</p></body></html>' })
    expect(r.findings.map((f) => f.id)).toEqual(expect.arrayContaining(['no-https', 'slow', 'mobile', 'no-cta', 'no-title']))
  })
  it('a clean, fast site produces no high or medium problems and no opener', () => {
    const r = analyzeSite({ ...base, html: good })
    expect(r.findings.filter((f) => f.level === 'high' || f.level === 'medium')).toEqual([])
    expect(r.opener).toBeNull()
  })
  it('lists plugins with versions', () => {
    expect(wpPlugins('<link href="/wp-content/plugins/yoast/a.css?ver=21.0">')).toEqual([{ slug: 'yoast', version: '21.0' }])
  })
})

describe('site check: address input', () => {
  it('adds https and rejects junk', () => {
    expect(normalizeSiteUrl('example.com')).toBe('https://example.com')
    expect(normalizeSiteUrl('http://example.com/page')).toBe('http://example.com/page')
    expect(normalizeSiteUrl('not a site')).toBeNull()
    expect(normalizeSiteUrl('localhost')).toBeNull()
  })
})
