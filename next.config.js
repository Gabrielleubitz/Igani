/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'igani.co', '*.igani.co'],
      /** Helps local / non-Vercel hosts; Vercel still caps request bodies ~4.5 MB (see uploadAdminImage). */
      bodySizeLimit: '10mb'
    }
  },
  images: {
    domains: ['localhost', 'igani.co'],
    formats: ['image/webp', 'image/avif']
  }
}

module.exports = nextConfig