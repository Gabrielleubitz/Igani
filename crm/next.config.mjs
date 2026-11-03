import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// The CRM lives in a subfolder of the Igani repo (which has its own lockfile): pin the root to this folder
const root = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: { root },
  outputFileTracingRoot: root,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }] },
  // Headless Chrome for contract PDFs: keep it out of the bundle so its binary is used as-is
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  outputFileTracingIncludes: {
      // Contract routes: Chrome binary, fonts and logos embedded into the PDF
      '/api/public/offers/*/sign': ['./lib/fonts/**', './node_modules/@sparticuz/chromium/bin/**', './public/igani-logo 2.png', './public/offers/**', './offers/*/assets.json'],
      '/api/public/offers/*/contract': ['./lib/fonts/**', './node_modules/@sparticuz/chromium/bin/**', './public/igani-logo 2.png', './public/offers/**', './offers/*/assets.json'],
      '/api/studio/pdf-check': ['./lib/fonts/**', './node_modules/@sparticuz/chromium/bin/**'],
      '/api/admin/offers/*/contract/preview': ['./lib/fonts/**', './node_modules/@sparticuz/chromium/bin/**', './public/igani-logo 2.png', './public/offers/**', './offers/*/assets.json'],
      // The export zips the offer's source files (screens, blocks, images) as they are in the repo
      '/api/admin/offers/*/export': ['./offers/**/*', './public/offers/**/*'],
      // The offer pages read offers/<slug>/assets.json (uploaded logo) at request time
      '/o/*': ['./offers/*/assets.json'],
      '/o/*/screen/*': ['./offers/*/assets.json'],
  },
}

export default nextConfig
