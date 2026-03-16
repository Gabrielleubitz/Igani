/**
 * Product-specific help page config.
 * Add new products by adding a config and using the same HelpPageTemplate.
 */

export interface HelpIssueCategory {
  value: string
  label: string
}

export interface HelpProductConfig {
  productSlug: string
  productName: string
  introTitle: string
  introBody: string
  /** e.g. "currently in beta" - optional */
  betaMessage?: string
  /** Optional logo URL (e.g. from product app). If not set, Igani logo is used. */
  logoPath?: string
  /** Default issue categories; can be overridden per product */
  issueCategories: HelpIssueCategory[]
  /** Default product value sent with form (must match productName for admin display) */
  defaultProductValue: string
  /** Optional: require ?src=<productSlug> or ?k= to show the form; otherwise show gate */
  requireSourceParam?: boolean
  /** Page locale — affects all UI strings and text direction. Defaults to 'en'. */
  locale?: 'en' | 'he'
}

const DEFAULT_ISSUE_CATEGORIES: HelpIssueCategory[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'something_not_working', label: 'Something not working' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'feature_request', label: 'Feature request' }
]

export const HELP_PRODUCT_CONFIGS: Record<string, HelpProductConfig> = {
  almalinks: {
    productSlug: 'almalinks',
    productName: 'AlmaLinks',
    introTitle: 'Help & Support',
    introBody:
      'AlmaLinks is built by Igani. Your feedback and bug reports directly help us improve the platform. We really appreciate you taking the time to reach out. All submissions go straight to our team—we read every one.',
    betaMessage: 'AlmaLinks is currently in beta.',
    logoPath: '/alma-logo.svg',
    issueCategories: DEFAULT_ISSUE_CATEGORIES,
    defaultProductValue: 'AlmaLinks',
    requireSourceParam: true
  },
  capital: {
    productSlug: 'capital',
    productName: 'Capital by Igani',
    introTitle: 'Help & Support',
    introBody:
      'Capital by Igani is our investment analysis platform. Report bugs, suggest features, or send feedback. All submissions go straight to our team.',
    betaMessage: undefined,
    issueCategories: DEFAULT_ISSUE_CATEGORIES,
    defaultProductValue: 'Capital by Igani',
    requireSourceParam: true
  },
  callmap: {
    productSlug: 'callmap',
    productName: 'Callmap',
    introTitle: 'Help & Support',
    introBody:
      'Callmap is built by Igani. Your feedback and bug reports directly help us improve the platform. We really appreciate you taking the time to reach out. All submissions go straight to our team—we read every one.',
    betaMessage: undefined,
    logoPath: '/callmap.svg',
    issueCategories: DEFAULT_ISSUE_CATEGORIES,
    defaultProductValue: 'Callmap',
    requireSourceParam: true
  },
  caleno: {
    productSlug: 'caleno',
    productName: 'Caleno',
    introTitle: 'תמיכה ועזרה',
    introBody:
      'Caleno נבנה על ידי Igani. המשוב ודיווחי הבאגים שלך עוזרים לנו ישירות לשפר את הפלטפורמה. אנחנו מעריכים את הזמן שהשקעת ליצור קשר. כל הפניות מגיעות ישירות לצוות שלנו—אנחנו קוראים כל אחת.',
    betaMessage: undefined,
    logoPath: '/calenologo.png',
    issueCategories: [
      { value: 'bug', label: 'באג' },
      { value: 'something_not_working', label: 'משהו לא עובד' },
      { value: 'feedback', label: 'משוב' },
      { value: 'feature_request', label: 'בקשת תכונה' }
    ],
    defaultProductValue: 'Caleno',
    requireSourceParam: true,
    locale: 'he'
  }
}

export function getHelpProductConfig(productSlug: string): HelpProductConfig | null {
  const slug = productSlug?.toLowerCase().trim()
  return (slug && HELP_PRODUCT_CONFIGS[slug]) || null
}

export function getAllHelpProductSlugs(): string[] {
  return Object.keys(HELP_PRODUCT_CONFIGS)
}
