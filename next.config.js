/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'igani.co', '*.igani.co'],
      /** Helps local / non-Vercel hosts; Vercel still caps request bodies ~4.5 MB (see uploadAdminImage). */
      bodySizeLimit: '10mb'
    }
  },
  transpilePackages: ['three'],
  // The public Packages page was removed: old links and search results land on the home page instead of a 404.
  // The marketing site is plain HTML in public/site. These serve it at the real addresses.
  // public/new-site holds the previous version; About, FAQ, Privacy and Terms still use its styles (NewSiteShell),
  // so keep it. To go back to the previous pages, point these at /new-site/*.html again.
  async rewrites() {
    return {
      beforeFiles: [
        { source: '/', destination: '/site/index.html' },
        { source: '/sales', destination: '/site/sales.html' },
        { source: '/marketing', destination: '/site/marketing.html' },
        { source: '/ai', destination: '/site/ai.html' },
        { source: '/build', destination: '/site/build.html' },
        { source: '/dumb-ass', destination: '/site/dumb-ass.html' },
      ],
    }
  },
  async redirects() {
    return [
      { source: '/packages', destination: '/', permanent: true },
      // The old dark landing pages are replaced by the new site's pages (query strings, like ad tags, are kept)
      { source: '/salescrm', destination: '/sales', permanent: true },
      { source: '/what-we-build', destination: '/build', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/sales.html', destination: '/sales', permanent: true },
      { source: '/marketing.html', destination: '/marketing', permanent: true },
      { source: '/ai.html', destination: '/ai', permanent: true },
      { source: '/build.html', destination: '/build', permanent: true },
      { source: '/dumb-ass.html', destination: '/dumb-ass', permanent: true },
      // The real estate page now lives on its own site; old ad, search and funnels links follow it (query string kept)
      { source: '/realestate', destination: 'https://realestate.igani.co', permanent: true },
      // The generic funnel pages are retired (the real estate page stays); old ad and search links land on the home page.
      { source: '/funnels', destination: '/', permanent: true },
      { source: '/funnel2', destination: '/', permanent: true },
      { source: '/funnel3', destination: '/', permanent: true },
      // Getting in touch is section 05 of the home page, so the separate pages point there.
      { source: '/contact', destination: '/#contact', permanent: true },
      { source: '/start', destination: '/#contact', permanent: true },
    ]
  },
  images: {
    domains: ['localhost', 'igani.co'],
    formats: ['image/webp', 'image/avif']
  }
}

module.exports = nextConfig