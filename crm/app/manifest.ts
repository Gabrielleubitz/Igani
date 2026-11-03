import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Igani CRM',
    short_name: 'Igani CRM',
    start_url: '/',
    display: 'standalone',
    background_color: '#000f1f',
    theme_color: '#000f1f',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
