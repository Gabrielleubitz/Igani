import 'server-only'
import { existsSync } from 'node:fs'

/**
 * HTML → PDF with headless Chrome. On Vercel (Linux) it uses @sparticuz/chromium; on a Mac it uses the installed
 * Google Chrome, so contracts look the same in local testing and in production.
 */
const MAC_CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium']

export interface PdfOptions {
  /** Small grey line at the bottom of every page (e.g. initials); page numbers are added automatically */
  footer?: string
}

export async function htmlToPdf(html: string, opts: PdfOptions = {}): Promise<Uint8Array> {
  const puppeteer = (await import('puppeteer-core')).default
  let executablePath: string
  let args: string[] = []
  if (process.platform === 'darwin') {
    const found = MAC_CHROME.find((p) => existsSync(p))
    if (!found) throw new Error('Google Chrome is needed to build PDFs locally.')
    executablePath = found
  } else {
    const chromium = (await import('@sparticuz/chromium')).default
    executablePath = await chromium.executablePath()
    args = chromium.args
  }
  const browser = await puppeteer.launch({ executablePath, args, headless: true })
  try {
    const page = await browser.newPage()
    // Defence in depth: the contract needs no scripts and no network (fonts and images are inline data URLs)
    await page.setJavaScriptEnabled(false)
    await page.setRequestInterception(true)
    page.on('request', (r) => (r.url().startsWith('data:') || r.url() === 'about:blank' ? r.continue() : r.abort()))
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })
    const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: `<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7.5px;color:#94a3b8;padding:0 16mm;display:flex;justify-content:space-between;"><span>${esc(opts.footer ?? '')}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
    })
    return new Uint8Array(pdf)
  } finally {
    await browser.close()
  }
}
