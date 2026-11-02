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
    return [{ source: '/packages', destination: '/', permanent: true }]
  },
  images: {
    domains: ['localhost', 'igani.co'],
    formats: ['image/webp', 'image/avif']
  }
}

module.exports = nextConfig