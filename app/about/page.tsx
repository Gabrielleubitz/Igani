import AboutPageClient from './AboutPageClient'
import { AboutFoundersSeo } from '@/components/AboutFoundersSeo'

export default function AboutPage() {
  return <AboutPageClient foundersSection={<AboutFoundersSeo />} />
}
