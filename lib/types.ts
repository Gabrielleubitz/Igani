import { z } from 'zod'

export const QuestionnaireSchema = z.object({
  brand: z.object({
    name: z.string().min(1, 'Brand name is required'),
    tagline: z.string().min(1, 'Tagline is required'),
    tone: z.enum(['simple', 'energetic', 'formal'])
  }),
  location: z.string().min(1, 'Location is required'),
  audience: z.object({
    founders: z.number().min(0).max(100),
    builders: z.number().min(0).max(100),
    investors: z.number().min(0).max(100)
  }),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
    secondary: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color')
  }),
  logo: z.string().optional(),
  heroImage: z.string().optional(),
  email: z.object({
    senderDomain: z.string().min(1, 'Sender domain is required')
  }),
  sms: z.object({
    country: z.string().min(1, 'SMS country is required')
  }),
  event: z.object({
    cadence: z.enum(['monthly', 'quarterly']),
    sampleName: z.string().min(1, 'Sample event name is required')
  })
})

export type QuestionnaireData = z.infer<typeof QuestionnaireSchema>

export const GeneratedCopySchema = z.object({
  site: z.object({
    brandName: z.string(),
    tagline: z.string(),
    home: z.object({
      heroTitle: z.string(),
      heroSubtitle: z.string()
    }),
    cta: z.string()
  }),
  emails: z.object({
    confirmation: z.object({
      subject: z.string(),
      html: z.string(),
      text: z.string()
    }),
    reminder24h: z.object({
      subject: z.string(),
      html: z.string(),
      text: z.string()
    }),
    postEvent: z.object({
      subject: z.string(),
      html: z.string(),
      text: z.string()
    })
  }),
  sms: z.object({
    reminder3h: z.string(),
    doorInfo: z.string()
  }),
  theme: z.object({
    colors: z.object({
      primary: z.string(),
      text: z.string().default('#11151A'),
      muted: z.string().default('#4B5563'),
      bg: z.string().default('#F7F5F3')
    }),
    roleColors: z.object({
      Organizer: z.string().default('#7A1E1E'),
      Speaker: z.string().default('#C27803'),
      Sponsor: z.string().default('#0E7490'),
      VIP: z.string().default('#6D28D9'),
      Staff: z.string().default('#374151'),
      Attendee: z.string().default('#475569')
    }),
    logo: z.object({
      dark: z.string().default('/branding/default/logo.svg'),
      light: z.string().default('/branding/default/logo-white.svg')
    }),
    images: z.object({
      hero: z.string().default('/branding/default/hero.jpg')
    }),
    brandName: z.string()
  })
})

export type GeneratedCopy = z.infer<typeof GeneratedCopySchema>

export interface PlanConfig {
  id: string
  name: string
  price: number
  priceId: string
  features: string[]
}

export const plans: PlanConfig[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    priceId: process.env.STRIPE_PRICE_STARTER || '',
    features: [
      'Event site template',
      'Basic customization',
      'Email templates',
      'SMS notifications'
    ]
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 199,
    priceId: process.env.STRIPE_PRICE_PLUS || '',
    features: [
      'Everything in Starter',
      'Advanced customization',
      'Priority support',
      'Custom branding'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 399,
    priceId: process.env.STRIPE_PRICE_PRO || '',
    features: [
      'Everything in Plus',
      'White-label license',
      'Source code access',
      '1:1 setup support'
    ]
  }
]