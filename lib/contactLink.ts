import { scrollToSection } from '@/app/components/funnel-shared/SectionSheet'

/** Anything that asks a visitor to get in touch or start a project goes to section 05 (the contact form) of the home page. */
export const CONTACT_HREF = '/#contact'

/** Click handler for a link to CONTACT_HREF: on the home page it glides to the section, elsewhere the link takes you home to it. */
export function goToContact(e?: { preventDefault: () => void }): void {
  if (typeof window !== 'undefined' && window.location.pathname === '/') {
    e?.preventDefault()
    scrollToSection('contact')
  }
}
