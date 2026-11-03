/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }] },
  experimental: {
    // The signing route reads the Hebrew-capable fonts from disk to build the signed PDF
    outputFileTracingIncludes: {
      '/api/public/offers/[slug]/sign': ['./lib/fonts/**'],
      // The export zips the offer's source files (screens, blocks, images) as they are in the repo
      '/api/admin/offers/[id]/export': ['./offers/**/*', './public/offers/**/*'],
      // The offer pages read offers/<slug>/assets.json (uploaded logo) at request time
      '/o/[slug]': ['./offers/*/assets.json'],
      '/o/[slug]/screen/[flow]': ['./offers/*/assets.json'],
    },
  },
}

export default nextConfig
