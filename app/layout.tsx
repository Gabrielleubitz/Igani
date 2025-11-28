import './globals.css'
import { Outfit } from 'next/font/google'
import Script from 'next/script'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { PromoBanner } from '@/components/PromoBanner'
import { getSiteSettings } from '@/lib/getSiteSettings'
import { Metadata } from 'next'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  return {
    title: settings.metaTitle || 'IGANI - Premium Website Development',
    description: settings.metaDescription || 'Transform your vision into a stunning digital presence with custom website development',
    keywords: settings.metaKeywords || 'web development, design, websites, digital solutions',
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
      ],
    },
    openGraph: {
      title: settings.metaTitle || 'IGANI - Premium Website Development',
      description: settings.metaDescription || 'Transform your vision into a stunning digital presence with custom website development',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: settings.metaTitle || 'IGANI - Premium Website Development',
      description: settings.metaDescription || 'Transform your vision into a stunning digital presence with custom website development',
    }
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" className="overflow-x-hidden">
      <head>
        {/* Hotjar Tracking Code for igani.co */}
        <Script
          id="hotjar"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:6586485,hjsv:6};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `,
          }}
        />
      </head>
      <body className={`${outfit.variable} font-sans overflow-x-hidden`}>
        <PromoBanner />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}