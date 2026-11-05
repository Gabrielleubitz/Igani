/** Loads Hotjar for the static pages in public/new-site (the ID lives in an environment variable, which static HTML cannot read). */
export const dynamic = 'force-static'

export function GET(): Response {
  const id = (process.env.NEXT_PUBLIC_HOTJAR_ID ?? '').replace(/\D/g, '')
  const js = id
    ? `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${id},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r);})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`
    : '/* analytics not configured */'
  return new Response(js, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
