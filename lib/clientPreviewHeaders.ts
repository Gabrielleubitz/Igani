/** CSP frame-ancestors value for Igani client sites so /preview can embed them live. */
export const IGANI_PREVIEW_FRAME_ANCESTORS = [
  "'self'",
  'https://www.igani.co',
  'https://igani.co',
  'http://localhost:3000',
  'http://localhost:3001',
] as const

/**
 * Drop into a client project's next.config.js `headers()` so igani.co can iframe the live site.
 */
export function clientPreviewHeaders() {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: `frame-ancestors ${IGANI_PREVIEW_FRAME_ANCESTORS.join(' ')}`,
        },
      ],
    },
  ]
}
