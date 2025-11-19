import '../globals.css'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata = {
  title: 'איגני - פיתוח אתרים פרמיום',
  description: 'הפוך את החזון שלך לנוכחות דיגיטלית מרהיבה עם פיתוח אתרים מותאמים אישית',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.svg', sizes: '16x16', type: 'image/svg+xml' }
    ],
  },
}

export default function HebrewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Hebrew layout with RTL support
  return (
    <html lang="he" dir="rtl">
      <body className={`${outfit.variable} font-sans rtl`}>{children}</body>
    </html>
  )
}