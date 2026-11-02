import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo/meta'

export const metadata: Metadata = pageMeta({
  title: 'Contact IGANI',
  description: 'Talk to IGANI about a new website for your business. Send us a message, call, or write on WhatsApp. Based in Netanya, Israel.',
  path: '/contact',
})

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
