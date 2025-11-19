import './globals.css'
import { Outfit } from 'next/font/google'

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
})

export const metadata = {
  title: 'Igani - Premium Website Development',
  description: 'Transform your vision into a stunning digital presence with custom website development',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.svg', sizes: '16x16', type: 'image/svg+xml' }
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // English layout (default)
  return (
    <html lang="en" dir="ltr">
      <body className={`${outfit.variable} font-sans`}>{children}</body>
    </html>
  )
}