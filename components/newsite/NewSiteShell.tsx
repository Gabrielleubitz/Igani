import Script from 'next/script'
import { FOOTER_HTML, HEADER_HTML, TOP_HTML } from './shell-html'

const CSS = ['tokens', 'bundle', 'site', 'pages', 'tour', 'home3', 'editorial', 'widgets3', 'inner3', 'legal'] as const

/**
 * The new site's top bar, header and footer around a page, so pages built in Next (About, FAQ, Privacy, Terms...) look
 * like the static pages in public/new-site. The header's behaviour comes from /new-site/nav.js.
 */
export function NewSiteShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="ed ns" data-theme="light">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600&display=swap" />
      {CSS.map((n) => (
        <link key={n} rel="stylesheet" href={`/new-site/${n}.css`} />
      ))}
      <div dangerouslySetInnerHTML={{ __html: TOP_HTML + HEADER_HTML }} />
      <main id="top">{children}</main>
      <div dangerouslySetInnerHTML={{ __html: FOOTER_HTML }} />
      <Script src="/new-site/nav.js" strategy="afterInteractive" />
    </div>
  )
}
