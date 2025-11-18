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
  priceMin: number;
  priceMax: number;
  priceUnit: string;
  bestFor: string;
  includes: string[];
  addOns: PackageAddOn[];
  delivery: string;
  roundsOfRevisions: number | null;
  order: number;
  published: boolean;
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
