export interface Website {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  image: string;
  featured: boolean;
  createdAt: string;
}

export interface AdminState {
  isAuthenticated: boolean;
  showAdmin: boolean;
}

export interface SiteSettings {
  siteName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  aboutTitle: string;
  aboutDescription: string;
  contactEmail: string;
  contactPhone: string;
  contactLocation: string;
  companyName: string;
  socialLinks: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  seoTitle: string;
  seoDescription: string;
}

export interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  projectType: string;
  message: string;
  submittedAt: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  cancellationReason?: string;
  statusUpdatedAt?: string;
  // Ticket management fields
  linkedPackageId?: string;
  linkedPackageName?: string;
  quotedPrice?: number;
  currency?: string;
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDelivery?: string;
  clientBudget?: string;
  followUpDate?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  company: string;
  role: string;
  message: string;
  rating: number;
  image?: string;
  featured: boolean;
  createdAt: string;
}

export interface PackageAddOn {
  name: string;
  priceNote: string;
}

export interface Package {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  price: number;
  priceUnit: string;
  showPricing: boolean;
  showDiscount?: boolean;
  originalPrice?: number;
  bestFor: string;
  includes: string[];
  addOns: PackageAddOn[];
  delivery: string;
  roundsOfRevisions: number | null;
  order: number;
  published: boolean;
  badge?: 'best-seller' | 'recommended' | 'popular' | 'new' | 'custom' | '' | undefined;
  customBadgeText?: string;
  customBadgeGradient?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenancePlan {
  id: string;
  name: string;
  price: number;
  includes: string[];
  order: number;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageFAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  published: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageSettings {
  currencySymbol: string;
  showComparison: boolean;
  contactCtaText: string;
  contactEmail: string;
  calendlyUrl: string;
}

export interface AboutUsSection {
  id: string;
  title: string;
  content: string;
  order: number;
  published: boolean;
  type: 'hero' | 'mission' | 'values' | 'team' | 'story' | 'custom';
  createdAt?: string;
  updatedAt?: string;
}

export interface AboutUsSettings {
  pageTitle: string;
  pageSubtitle: string;
  heroImage?: string;
  metaDescription: string;
}

export interface PromoBannerSettings {
  enabled: boolean;

  // Content
  title: string;
  subtitle?: string;
  accentWord?: string; // Word to highlight with accent color

  // CTA
  ctaLabel?: string;
  ctaUrl?: string;
  ctaStyle?: 'pill' | 'default';
  ctaColor?: string;

  // Image
  image?: string;
  imagePosition?: 'inline' | 'right';

  // Styling
  backgroundColor: string;
  backgroundGradient?: string; // Optional gradient override
  textColor: string;
  accentColor?: string; // For highlighted words
  fontSize: 'small' | 'medium' | 'large';
  fontWeight: '400' | '500' | '600' | '700';
  textAlign: 'left' | 'center';
  glowEffect?: boolean; // Soft glow behind banner
  textGlow?: boolean; // Text highlight effect

  // Animation
  animationType: 'none' | 'fade' | 'slide' | 'marquee';
  animationSpeed: 'slow' | 'medium' | 'fast';
  marqueeDirection?: 'left' | 'right';

  // Behavior
  dismissible: boolean;

  // Scheduling
  startDate?: string;
  endDate?: string;
}
