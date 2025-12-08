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
  // Build ProductFlow widget script with environment variable (fallback to hardcoded for development)
  const productflowFirebaseApiKey = process.env.NEXT_PUBLIC_PRODUCTFLOW_FIREBASE_API_KEY || 'AIzaSyCOQBT98TQumcTJnCcXSKE1B0sycQkpoo0';
  
  // Construct the script content with proper string interpolation
  const productflowScript = `(function() {
    // Scoped guard so multiple GTM tags don't double-load
    window.__productflow_registry = window.__productflow_registry || new Set();
    if (window.__productflow_registry.has('igani')) return;
    window.__productflow_registry.add('igani');

    // Inject critical YouTube interaction styles
    var style = document.createElement('style');
    style.id = 'productflow-youtube-fix';
    style.textContent = '/* Critical YouTube iframe interaction fixes for ProductFlow widget */ .productflow-post::before { content: none !important; display: none !important; pointer-events: none !important; } .productflow-post { position: relative !important; } .productflow-post::before { pointer-events: none !important; } iframe[src*="youtube.com"], iframe[src*="youtube-nocookie.com"], iframe[src*="youtu.be"] { pointer-events: auto !important; position: relative !important; z-index: 999999 !important; border: none !important; outline: none !important; background: transparent !important; display: block !important; touch-action: auto !important; user-select: auto !important; isolation: auto !important; } #productflow-widget-container, #productflow-widget-container *, .productflow-widget-container, .productflow-widget-container *, [id*="productflow-widget"], [id*="productflow-widget"] *, [class*="productflow-widget"], [class*="productflow-widget"] *, .productflow-posts, .productflow-posts *, .productflow-chat, .productflow-chat *, .productflow-post, .productflow-post *, .productflow-post-content, .productflow-post-content * { pointer-events: auto !important; } div:has(> iframe[src*="youtube"]), p:has(> iframe[src*="youtube"]), span:has(> iframe[src*="youtube"]) { pointer-events: auto !important; z-index: 999998 !important; position: relative !important; isolation: auto !important; } [class*="overflow-"] iframe[src*="youtube"], [class*="scroll-"] iframe[src*="youtube"], [class*="max-h-"] iframe[src*="youtube"], [class*="h-"] iframe[src*="h-"] iframe[src*="youtube"] { pointer-events: auto !important; z-index: 999999 !important; position: relative !important; }';
    document.head.appendChild(style);

    // Widget Configuration
    window.productflow_config = {
      product_id: 'igani',
      position: 'bottom-right',
      buttonText: 'What\\'s New',
      widgetTitle: 'Product Updates',
      primaryColor: '#2563eb',
      darkMode: false,
      showButton: true,
      apiUrl: 'https://scotty-plum.vercel.app',
      firebaseConfig: {
        apiKey: '${productflowFirebaseApiKey}',
        authDomain: 'scotty-dccad.firebaseapp.com',
        projectId: 'scotty-dccad',
        storageBucket: 'scotty-dccad.firebasestorage.app',
        messagingSenderId: '966416224400',
        appId: '1:966416224400:web:d0476a8418665d42a0c815'
      },
      aiAgent: {
        enabled: true,
        apiUrl: 'https://api.openai.com/v1',
        trackingUrl: 'https://scotty-plum.vercel.app'
      },
      teamId: 'lHstPlacdVjgTcyrC7nh'
    };

    // Script loader with CSP and error handling
    function loadScript(src) {
      var script = document.createElement('script');
      script.src = src.trim();
      script.defer = true;

      // Copy GTM's nonce (if available) so CSP doesn't block it
      var gtmNonce = document.currentScript && document.currentScript.nonce;
      if (gtmNonce) script.nonce = gtmNonce;

      script.onerror = function() {
        console.warn('ProductFlow script failed to load:', src);
      };

      document.head.appendChild(script);
    }

    // Load the widget script with cache busting
    loadScript('https://scotty-plum.vercel.app/widget.js?v=1765193727484');
    
    // Debug logging (remove in production if desired)
    console.log('ProductFlow: Widget config loaded', window.productflow_config);
    console.log('ProductFlow: Loading widget script from', 'https://scotty-plum.vercel.app/widget.js');
  })();`;

  return (
    <html lang="en" dir="ltr" className="overflow-x-hidden">
      <head>
        {/* Hotjar Tracking Code for igani.co */}
        {process.env.NEXT_PUBLIC_HOTJAR_ID && (
          <Script
            id="hotjar"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(h,o,t,j,a,r){
                  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                  h._hjSettings={hjid:${process.env.NEXT_PUBLIC_HOTJAR_ID},hjsv:6};
                  a=o.getElementsByTagName('head')[0];
                  r=o.createElement('script');r.async=1;
                  r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                  a.appendChild(r);
                })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
              `,
            }}
          />
        )}
      </head>
      <body className={`${outfit.variable} font-sans overflow-x-hidden`}>
        {/* ProductFlow Changelog Widget */}
        <Script
          id="productflow-widget"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: productflowScript,
          }}
        />
        <PromoBanner />
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}