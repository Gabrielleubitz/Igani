import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { Package, MaintenancePlan, PackageFAQ, PackageSettings } from '../types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only once to avoid duplicate app error
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const defaultPackages: Omit<Package, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    slug: "spark",
    name: "IGANI Spark — Landing Page",
    tagline: "Modern 1-page landing built to convert",
    priceMin: 2500,
    priceMax: 3500,
    priceUnit: "NIS",
    bestFor: "Small businesses, influencers, events, simple funnels",
    includes: [
      "1-page modern landing page",
      "Fully custom design (not a template)",
      "Mobile responsive",
      "Fast performance",
      "Basic SEO setup",
      "Contact form + email integration",
      "1 round of revisions",
      "Delivery in 3–5 days"
    ],
    addOns: [
      { name: "Copywriting", priceNote: "+400 NIS" },
      { name: "Animation pack", priceNote: "+350 NIS" },
      { name: "Hosting + maintenance", priceNote: "350 NIS/month" }
    ],
    delivery: "3–5 days",
    roundsOfRevisions: 1,
    order: 1,
    published: true
  },
  {
    slug: "core",
    name: "IGANI Core — Small Business Website (3–5 pages)",
    tagline: "A real online presence with room to grow",
    priceMin: 5000,
    priceMax: 8000,
    priceUnit: "NIS",
    bestFor: "Brands that need a proper site",
    includes: [
      "3–5 pages (Home, About, Services, Contact, etc.)",
      "Fully custom UI/UX",
      "Mobile + tablet responsive",
      "Speed optimization",
      "SEO-ready structure",
      "Contact forms + integrations (WhatsApp, CRM, email)",
      "On-site animations",
      "2 rounds of revisions",
      "Delivery in 7–14 days"
    ],
    addOns: [
      { name: "Blog system", priceNote: "+900 NIS" },
      { name: "Multi-language", priceNote: "+800 NIS" },
      { name: "Copywriting", priceNote: "+600–1,000 NIS" }
    ],
    delivery: "7–14 days",
    roundsOfRevisions: 2,
    order: 2,
    published: true
  },
  {
    slug: "pro",
    name: "IGANI Pro — Premium Brand Site (6–10 pages)",
    tagline: "High-end look and full polish",
    priceMin: 10000,
    priceMax: 18000,
    priceUnit: "NIS",
    bestFor: "Teams that want a polished digital presence",
    includes: [
      "6–10 pages",
      "Advanced animations + motion design",
      "Premium UI/UX (brand guidelines included)",
      "Mobile-first responsive build",
      "Full SEO setup (keywords, meta, indexing)",
      "Custom components (sliders, galleries, cards)",
      "Integration to CRM, booking system, chat, etc.",
      "Google Analytics + conversions setup",
      "3 rounds of revisions",
      "Delivery in 2–4 weeks"
    ],
    addOns: [],
    delivery: "2–4 weeks",
    roundsOfRevisions: 3,
    order: 3,
    published: true
  },
  {
    slug: "commerce",
    name: "IGANI Commerce — E-Commerce Website",
    tagline: "A store that looks good and sells",
    priceMin: 12000,
    priceMax: 30000,
    priceUnit: "NIS",
    bestFor: "Shops needing full online sales",
    includes: [
      "Full online store",
      "Product page templates",
      "Cart + checkout flow",
      "Payment integrations (PayPal, Stripe, Tranzila, etc.)",
      "Shipping + delivery setup",
      "Inventory management system",
      "Analytics + conversions",
      "SEO + performance optimization",
      "Admin training"
    ],
    addOns: [
      { name: "Multi-language", priceNote: "+1,200 NIS" },
      { name: "Product uploads", priceNote: "+10–20 NIS/product" },
      { name: "Advanced automations", priceNote: "+800–2,000 NIS" }
    ],
    delivery: "Timeline depends on catalog size",
    roundsOfRevisions: null,
    order: 4,
    published: true
  },
  {
    slug: "systems",
    name: "IGANI Systems — Custom Web App / Dashboard",
    tagline: "Product-level builds for startups and teams",
    priceMin: 20000,
    priceMax: 100000,
    priceUnit: "NIS",
    bestFor: "Startups or businesses needing real functionality",
    includes: [
      "User login systems",
      "Dashboards",
      "Custom APIs",
      "Databases",
      "Admin panel",
      "Full backend + frontend",
      "Cloud deployment",
      "UX/UI for SaaS",
      "Long-term maintenance options"
    ],
    addOns: [],
    delivery: "Scoping required",
    roundsOfRevisions: null,
    order: 5,
    published: true
  }
];

const defaultMaintenancePlans: Omit<MaintenancePlan, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: "IGANI Care Basic",
    price: 350,
    includes: ["Hosting", "Security updates", "Uptime monitoring", "1 small edit per month"],
    order: 1,
    published: true
  },
  {
    name: "IGANI Care Plus",
    price: 650,
    includes: ["Hosting", "Weekly backups", "Up to 3 monthly edits", "Priority support", "Analytics reports"],
    order: 2,
    published: true
  },
  {
    name: "IGANI Care Pro",
    price: 1000,
    includes: ["Everything above", "Unlimited small edits", "Monthly strategy call", "SEO updates"],
    order: 3,
    published: true
  }
];

const defaultFAQs: Omit<PackageFAQ, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    question: "What's included in the price?",
    answer: "Each package includes everything listed in the 'includes' section. No hidden fees or surprise charges. Add-ons are optional and clearly priced.",
    order: 1,
    published: true
  },
  {
    question: "How long does it take to build my site?",
    answer: "Timeline depends on the package: Spark takes 3-5 days, Core takes 7-14 days, Pro takes 2-4 weeks, Commerce varies by catalog size, and Systems requires scoping.",
    order: 2,
    published: true
  },
  {
    question: "Do I need to provide content and images?",
    answer: "Yes, you'll need to provide your content, images, and brand assets. We can recommend copywriting and photography services if needed (see add-ons).",
    order: 3,
    published: true
  },
  {
    question: "What happens after launch?",
    answer: "We offer maintenance plans to keep your site secure, updated, and performing well. You can also request additional features or modifications anytime.",
    order: 4,
    published: true
  },
  {
    question: "Can I upgrade my package later?",
    answer: "Absolutely! You can always add features, pages, or functionality to your existing site. We'll provide a custom quote based on your needs.",
    order: 5,
    published: true
  }
];

const defaultPackageSettings: PackageSettings = {
  currencySymbol: "₪",
  showComparison: true,
  contactCtaText: "Free Consultation",
  contactEmail: "info@igani.co",
  calendlyUrl: ""
};

export const seedPackages = async (): Promise<void> => {
  try {
    console.log('Starting to seed packages...');

    // Seed packages
    for (const packageData of defaultPackages) {
      await addDoc(collection(db, 'packages'), {
        ...packageData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Added package: ${packageData.name}`);
    }

    // Seed maintenance plans
    for (const planData of defaultMaintenancePlans) {
      await addDoc(collection(db, 'maintenancePlans'), {
        ...planData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Added maintenance plan: ${planData.name}`);
    }

    // Seed FAQs
    for (const faqData of defaultFAQs) {
      await addDoc(collection(db, 'faqs'), {
        ...faqData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Added FAQ: ${faqData.question}`);
    }

    // Seed package settings
    await setDoc(doc(db, 'settings', 'packages'), defaultPackageSettings);
    console.log('Added package settings');

    console.log('Successfully seeded all packages data!');
  } catch (error) {
    console.error('Error seeding packages:', error);
    throw error;
  }
};

// Export the seed function for use in admin panel
export { defaultPackages, defaultMaintenancePlans, defaultFAQs, defaultPackageSettings };