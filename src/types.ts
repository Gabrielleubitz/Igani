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
  status: 'new' | 'read' | 'replied';
}