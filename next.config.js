/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'igani.co', '*.igani.co']
    }
  },
  images: {
    domains: ['localhost', 'igani.co'],
    formats: ['image/webp', 'image/avif']
  }
}

module.exports = nextConfig