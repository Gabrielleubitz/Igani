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
  }
}

export function getHelpProductConfig(productSlug: string): HelpProductConfig | null {
  const slug = productSlug?.toLowerCase().trim()
  return (slug && HELP_PRODUCT_CONFIGS[slug]) || null
}

export function getAllHelpProductSlugs(): string[] {
  return Object.keys(HELP_PRODUCT_CONFIGS)
}
