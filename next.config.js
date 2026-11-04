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
  async redirects() {
    return [
      { source: '/packages', destination: '/', permanent: true },
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