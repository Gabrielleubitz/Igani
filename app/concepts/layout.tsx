import type { Metadata } from 'next'

// Concept agent sites designed by IGANI to show the style of work in the real-estate funnel. Not real businesses.
export const metadata: Metadata = {
  title: 'Concept site by IGANI',
  robots: { index: false, follow: false },
}

export default function ConceptsLayout({ children }: { children: React.ReactNode }) {
  return children
}
