import { Website } from '../types';

export const sampleWebsites: Website[] = [
  {
    id: '1',
    title: 'TechStart Solutions',
    description: 'Modern SaaS platform with sleek design and powerful analytics dashboard. Built with React, Next.js, and TypeScript for optimal performance.',
    url: 'https://saas-dashboard-demo.vercel.app',
    category: 'SaaS',
    image: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: true,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    title: 'Artisan Bakery',
    description: 'Elegant e-commerce website for local bakery with online ordering system, payment processing, and inventory management.',
    url: 'https://ecommerce-bakery-demo.vercel.app',
    category: 'E-commerce',
    image: 'https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: true,
    createdAt: '2024-01-20'
  },
  {
    id: '3',
    title: 'Green Architecture',
    description: 'Portfolio website showcasing sustainable architecture projects with interactive galleries and project case studies.',
    url: 'https://architecture-portfolio-demo.vercel.app',
    category: 'Portfolio',
    image: 'https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
    createdAt: '2024-02-01'
  },
  {
    id: '4',
    title: 'FinanceFlow',
    description: 'Corporate website for financial services with client portal integration, secure document sharing, and real-time analytics.',
    url: 'https://finance-corporate-demo.vercel.app',
    category: 'Corporate',
    image: 'https://images.pexels.com/photos/590020/pexels-photo-590020.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: true,
    createdAt: '2024-02-10'
  },
  {
    id: '5',
    title: 'Wellness Center',
    description: 'Healthcare website with appointment booking system, patient portal, and HIPAA-compliant messaging platform.',
    url: 'https://healthcare-wellness-demo.vercel.app',
    category: 'Healthcare',
    image: 'https://images.pexels.com/photos/4386370/pexels-photo-4386370.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
    createdAt: '2024-02-15'
  },
  {
    id: '6',
    title: 'Creative Studio',
    description: 'Interactive portfolio for digital design agency with stunning animations, parallax effects, and case study presentations.',
    url: 'https://creative-agency-demo.vercel.app',
    category: 'Creative',
    image: 'https://images.pexels.com/photos/3585088/pexels-photo-3585088.jpeg?auto=compress&cs=tinysrgb&w=800',
    featured: false,
    createdAt: '2024-02-20'
  }
];
