/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }] },
  experimental: {
    // The signing route reads the Hebrew-capable fonts from disk to build the signed PDF
    outputFileTracingIncludes: { '/api/public/offers/[slug]/sign': ['./lib/fonts/**'] },
  },
}

export default nextConfig
