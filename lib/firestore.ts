import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { SiteSettings, ContactSubmission, Website, Testimonial, Package, MaintenancePlan, PackageFAQ, PackageSettings, AboutUsSection, AboutUsSettings, PromoBannerSettings } from '../types';

// Collections
const SETTINGS_COLLECTION = 'settings';
const CONTACT_SUBMISSIONS_COLLECTION = 'contactSubmissions';
const WEBSITES_COLLECTION = 'websites';
const TESTIMONIALS_COLLECTION = 'testimonials';
const PACKAGES_COLLECTION = 'packages';
const MAINTENANCE_PLANS_COLLECTION = 'maintenancePlans';
const PACKAGE_FAQS_COLLECTION = 'faqs';
const ABOUT_US_SECTIONS_COLLECTION = 'aboutUsSections';
const PROMO_BANNER_COLLECTION = 'promoBanner';

// Settings Functions
export const saveSettings = async (settings: SiteSettings): Promise<void> => {
  try {
    // Use a fixed document ID for settings
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'main');
    await updateDoc(settingsRef, {
      ...settings,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    // If document doesn't exist, create it
    await addDoc(collection(db, SETTINGS_COLLECTION), {
      ...settings,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  }
};

export const getSettings = async (): Promise<SiteSettings | null> => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'main');
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
      } as SiteSettings;
    }

    return null;
  } catch (error) {
    console.error('Error getting settings:', error);
    return null;
  }
};

// Contact Submissions Functions
export const saveContactSubmission = async (
  submission: Omit<ContactSubmission, 'id' | 'submittedAt' | 'status' | 'assignedTo' | 'cancellationReason' | 'statusUpdatedAt'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, CONTACT_SUBMISSIONS_COLLECTION), {
      ...submission,
      submittedAt: Timestamp.now(),
      status: 'pending' as const,
      statusUpdatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving contact submission:', error);
    throw error;
  }
};

export const getContactSubmissions = async (): Promise<ContactSubmission[]> => {
  try {
    const q = query(
      collection(db, CONTACT_SUBMISSIONS_COLLECTION),
      orderBy('submittedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const submissions: ContactSubmission[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();

      // Map old status values to new ones
      let status: ContactSubmission['status'] = data.status || 'pending';
      if (status === 'new' as any) status = 'pending';
      if (status === 'read' as any) status = 'pending';
      if (status === 'replied' as any) status = 'in-progress';

      // Helper function to safely convert timestamp to ISO string
      const toISOString = (timestamp: any): string => {
        if (!timestamp) return new Date().toISOString();
        if (typeof timestamp === 'string') return timestamp;
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
          return timestamp.toDate().toISOString();
        }
        return new Date(timestamp).toISOString();
      };

      submissions.push({
        id: doc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        projectType: data.projectType || '',
        message: data.message || '',
        submittedAt: toISOString(data.submittedAt),
        status: status,
        assignedTo: data.assignedTo,
        cancellationReason: data.cancellationReason,
        statusUpdatedAt: data.statusUpdatedAt ? toISOString(data.statusUpdatedAt) : undefined,
        // Add the new ticket management fields
        linkedPackageId: data.linkedPackageId,
        linkedPackageName: data.linkedPackageName,
        quotedPrice: data.quotedPrice,
        currency: data.currency,
        notes: data.notes,
        priority: data.priority,
        estimatedDelivery: data.estimatedDelivery,
        clientBudget: data.clientBudget,
        followUpDate: data.followUpDate
      });
    });

    return submissions;
  } catch (error) {
    console.error('Error getting contact submissions:', error);
    return [];
  }
};

export const updateContactSubmissionStatus = async (
  id: string,
  status: ContactSubmission['status'],
  cancellationReason?: string
): Promise<void> => {
  try {
    const submissionRef = doc(db, CONTACT_SUBMISSIONS_COLLECTION, id);
    const updateData: any = {
      status,
      statusUpdatedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    if (status === 'cancelled' && cancellationReason) {
      updateData.cancellationReason = cancellationReason;
    }

    await updateDoc(submissionRef, updateData);
  } catch (error) {
    console.error('Error updating submission status:', error);
    throw error;
  }
};

export const assignSubmissionToDeveloper = async (
  id: string,
  developerName: string
): Promise<void> => {
  try {
    const submissionRef = doc(db, CONTACT_SUBMISSIONS_COLLECTION, id);
    await updateDoc(submissionRef, {
      assignedTo: developerName,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error assigning submission:', error);
    throw error;
  }
};

export const deleteContactSubmission = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, CONTACT_SUBMISSIONS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting submission:', error);
    throw error;
  }
};

// Helper function to remove undefined values from an object
const cleanObjectForFirestore = (obj: Record<string, any>): Record<string, any> => {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

export const updateContactSubmission = async (submission: ContactSubmission): Promise<void> => {
  try {
    const submissionRef = doc(db, CONTACT_SUBMISSIONS_COLLECTION, submission.id);
    
    // Create update data excluding id and adding timestamp
    const { id, ...updateData } = submission;
    const dataWithTimestamp = {
      ...updateData,
      updatedAt: Timestamp.now()
    };
    
    // Clean undefined values before sending to Firestore
    const finalUpdateData = cleanObjectForFirestore(dataWithTimestamp);
    
    await updateDoc(submissionRef, finalUpdateData);
  } catch (error) {
    console.error('Error updating contact submission:', error);
    throw error;
  }
};

// Website Functions
export const saveWebsite = async (
  website: Omit<Website, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, WEBSITES_COLLECTION), {
      ...website,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving website:', error);
    throw error;
  }
};

export const getWebsites = async (): Promise<Website[]> => {
  try {
    const q = query(
      collection(db, WEBSITES_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const websites: Website[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      websites.push({
        id: doc.id,
        title: data.title,
        description: data.description,
        url: data.url,
        category: data.category,
        image: data.image,
        featured: data.featured || false,
        createdAt: data.createdAt
      });
    });

    return websites;
  } catch (error) {
    console.error('Error getting websites:', error);
    return [];
  }
};

export const updateWebsite = async (website: Website): Promise<void> => {
  try {
    const websiteRef = doc(db, WEBSITES_COLLECTION, website.id);
    await updateDoc(websiteRef, {
      title: website.title,
      description: website.description,
      url: website.url,
      category: website.category,
      image: website.image,
      featured: website.featured,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating website:', error);
    throw error;
  }
};

export const deleteWebsite = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, WEBSITES_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting website:', error);
    throw error;
  }
};

// Testimonial Functions
export const saveTestimonial = async (
  testimonial: Omit<Testimonial, 'id' | 'createdAt'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, TESTIMONIALS_COLLECTION), {
      ...testimonial,
      createdAt: new Date().toISOString(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving testimonial:', error);
    throw error;
  }
};

export const getTestimonials = async (): Promise<Testimonial[]> => {
  try {
    const q = query(
      collection(db, TESTIMONIALS_COLLECTION),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const testimonials: Testimonial[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      testimonials.push({
        id: doc.id,
        name: data.name,
        company: data.company,
        role: data.role,
        message: data.message,
        rating: data.rating,
        image: data.image,
        featured: data.featured || false,
        createdAt: data.createdAt
      });
    });

    return testimonials;
  } catch (error) {
    console.error('Error getting testimonials:', error);
    return [];
  }
};

export const updateTestimonial = async (testimonial: Testimonial): Promise<void> => {
  try {
    const testimonialRef = doc(db, TESTIMONIALS_COLLECTION, testimonial.id);
    await updateDoc(testimonialRef, {
      name: testimonial.name,
      company: testimonial.company,
      role: testimonial.role,
      message: testimonial.message,
      rating: testimonial.rating,
      image: testimonial.image,
      featured: testimonial.featured,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    throw error;
  }
};

export const deleteTestimonial = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, TESTIMONIALS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    throw error;
  }
};

// Package Functions
export const savePackage = async (packageData: Omit<Package, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    const cleanData = cleanObjectForFirestore({
      ...packageData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    const docRef = await addDoc(collection(db, PACKAGES_COLLECTION), cleanData);
  } catch (error) {
    console.error('Error saving package:', error);
    throw error;
  }
};

export const getPackages = async (): Promise<Package[]> => {
  try {
    const q = query(
      collection(db, PACKAGES_COLLECTION),
      orderBy('order', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const packages: Package[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      packages.push({
        id: doc.id,
        slug: data.slug,
        name: data.name,
        tagline: data.tagline,
        price: data.price || data.priceMin || 0,
        priceUnit: data.priceUnit || 'NIS',
        showPricing: data.showPricing !== undefined ? data.showPricing : true,
        showDiscount: data.showDiscount || false,
        originalPrice: data.originalPrice,
        bestFor: data.bestFor,
        includes: data.includes || [],
        addOns: data.addOns || [],
        delivery: data.delivery,
        roundsOfRevisions: data.roundsOfRevisions,
        order: data.order,
        published: data.published || false,
        badge: data.badge || '',
        customBadgeText: data.customBadgeText,
        customBadgeGradient: data.customBadgeGradient,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    return packages;
  } catch (error) {
    console.error('Error getting packages:', error);
    return [];
  }
};

export const updatePackage = async (packageData: Package): Promise<void> => {
  try {
    const packageRef = doc(db, PACKAGES_COLLECTION, packageData.id);
    const updateData = cleanObjectForFirestore({
      slug: packageData.slug,
      name: packageData.name,
      tagline: packageData.tagline,
      price: packageData.price,
      priceUnit: packageData.priceUnit,
      showPricing: packageData.showPricing,
      showDiscount: packageData.showDiscount,
      originalPrice: packageData.originalPrice,
      bestFor: packageData.bestFor,
      includes: packageData.includes,
      addOns: packageData.addOns,
      delivery: packageData.delivery,
      roundsOfRevisions: packageData.roundsOfRevisions,
      order: packageData.order,
      badge: packageData.badge || '',
      customBadgeText: packageData.customBadgeText,
      customBadgeGradient: packageData.customBadgeGradient,
      published: packageData.published,
      updatedAt: Timestamp.now()
    });
    await updateDoc(packageRef, updateData);
  } catch (error) {
    console.error('Error updating package:', error);
    throw error;
  }
};

export const deletePackage = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, PACKAGES_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting package:', error);
    throw error;
  }
};

// Maintenance Plan Functions
export const saveMaintenancePlan = async (planData: Omit<MaintenancePlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    const docRef = await addDoc(collection(db, MAINTENANCE_PLANS_COLLECTION), {
      ...planData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error saving maintenance plan:', error);
    throw error;
  }
};

export const getMaintenancePlans = async (): Promise<MaintenancePlan[]> => {
  try {
    const q = query(
      collection(db, MAINTENANCE_PLANS_COLLECTION),
      orderBy('order', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const plans: MaintenancePlan[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      plans.push({
        id: doc.id,
        name: data.name,
        price: data.price,
        includes: data.includes || [],
        order: data.order,
        published: data.published || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    return plans;
  } catch (error) {
    console.error('Error getting maintenance plans:', error);
    return [];
  }
};

export const updateMaintenancePlan = async (planData: MaintenancePlan): Promise<void> => {
  try {
    const planRef = doc(db, MAINTENANCE_PLANS_COLLECTION, planData.id);
    await updateDoc(planRef, {
      name: planData.name,
      price: planData.price,
      includes: planData.includes,
      order: planData.order,
      published: planData.published,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating maintenance plan:', error);
    throw error;
  }
};

export const deleteMaintenancePlan = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, MAINTENANCE_PLANS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting maintenance plan:', error);
    throw error;
  }
};

// Package FAQ Functions
export const savePackageFAQ = async (faqData: Omit<PackageFAQ, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    const docRef = await addDoc(collection(db, PACKAGE_FAQS_COLLECTION), {
      ...faqData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error saving package FAQ:', error);
    throw error;
  }
};

export const getPackageFAQs = async (): Promise<PackageFAQ[]> => {
  try {
    const q = query(
      collection(db, PACKAGE_FAQS_COLLECTION),
      orderBy('order', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const faqs: PackageFAQ[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      faqs.push({
        id: doc.id,
        question: data.question,
        answer: data.answer,
        order: data.order,
        published: data.published || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    return faqs;
  } catch (error) {
    console.error('Error getting package FAQs:', error);
    return [];
  }
};

export const updatePackageFAQ = async (faqData: PackageFAQ): Promise<void> => {
  try {
    const faqRef = doc(db, PACKAGE_FAQS_COLLECTION, faqData.id);
    await updateDoc(faqRef, {
      question: faqData.question,
      answer: faqData.answer,
      order: faqData.order,
      published: faqData.published,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating package FAQ:', error);
    throw error;
  }
};

export const deletePackageFAQ = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, PACKAGE_FAQS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting package FAQ:', error);
    throw error;
  }
};

// Package Settings Functions
export const savePackageSettings = async (settings: PackageSettings): Promise<void> => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'packages');
    await updateDoc(settingsRef, { ...settings });
  } catch (error) {
    console.error('Error saving package settings:', error);
    throw error;
  }
};

export const getPackageSettings = async (): Promise<PackageSettings | null> => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'packages');
    const docSnap = await getDoc(settingsRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        currencySymbol: data.currencySymbol || '₪',
        showComparison: data.showComparison !== undefined ? data.showComparison : true,
        contactCtaText: data.contactCtaText || 'Book a 20-min call',
        contactEmail: data.contactEmail || 'info@igani.co',
        calendlyUrl: data.calendlyUrl || ''
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting package settings:', error);
    return null;
  }
};

// About Us Section Functions
export const saveAboutUsSection = async (sectionData: Omit<AboutUsSection, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  try {
    const docRef = await addDoc(collection(db, ABOUT_US_SECTIONS_COLLECTION), {
      ...sectionData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error saving about us section:', error);
    throw error;
  }
};

export const getAboutUsSections = async (): Promise<AboutUsSection[]> => {
  try {
    const q = query(
      collection(db, ABOUT_US_SECTIONS_COLLECTION),
      orderBy('order', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const sections: AboutUsSection[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      sections.push({
        id: doc.id,
        title: data.title,
        content: data.content,
        order: data.order,
        published: data.published || false,
        type: data.type || 'custom',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    return sections;
  } catch (error) {
    console.error('Error getting about us sections:', error);
    return [];
  }
};

export const updateAboutUsSection = async (sectionData: AboutUsSection): Promise<void> => {
  try {
    const sectionRef = doc(db, ABOUT_US_SECTIONS_COLLECTION, sectionData.id);
    await updateDoc(sectionRef, {
      title: sectionData.title,
      content: sectionData.content,
      order: sectionData.order,
      published: sectionData.published,
      type: sectionData.type,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating about us section:', error);
    throw error;
  }
};

export const deleteAboutUsSection = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, ABOUT_US_SECTIONS_COLLECTION, id));
  } catch (error) {
    console.error('Error deleting about us section:', error);
    throw error;
  }
};

// About Us Settings Functions
export const saveAboutUsSettings = async (settings: AboutUsSettings): Promise<void> => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'aboutUs');
    await updateDoc(settingsRef, { ...settings });
  } catch (error) {
    console.error('Error saving about us settings:', error);
    throw error;
  }
};

export const getAboutUsSettings = async (): Promise<AboutUsSettings | null> => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'aboutUs');
    const docSnap = await getDoc(settingsRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        pageTitle: data.pageTitle || 'About IGANI',
        pageSubtitle: data.pageSubtitle || 'Crafting digital experiences with passion and precision',
        heroImage: data.heroImage || '',
        metaDescription: data.metaDescription || 'Learn about IGANI - your trusted partner for premium web development and digital solutions.'
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting about us settings:', error);
    return null;
  }
};

// Promo Banner Functions (V1 - Single Active Banner)
export const savePromoBannerSettings = async (settings: PromoBannerSettings): Promise<void> => {
  try {
    const bannerRef = doc(db, PROMO_BANNER_COLLECTION, 'main');
    await updateDoc(bannerRef, {
      ...settings,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    // If document doesn't exist, create it
    try {
      const bannerRef = doc(db, PROMO_BANNER_COLLECTION, 'main');
      await setDoc(bannerRef, {
        ...settings,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (createError) {
      console.error('Error saving promo banner settings:', createError);
      throw createError;
    }
  }
};

export const getPromoBannerSettings = async (): Promise<PromoBannerSettings | null> => {
  try {
    const bannerRef = doc(db, PROMO_BANNER_COLLECTION, 'main');
    const docSnap = await getDoc(bannerRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        enabled: data.enabled || false,
        title: data.title || '',
        subtitle: data.subtitle || '',
        accentWord: data.accentWord || '',
        ctaLabel: data.ctaLabel || '',
        ctaUrl: data.ctaUrl || '',
        ctaStyle: data.ctaStyle || 'pill',
        ctaColor: data.ctaColor || '',
        image: data.image || '',
        imagePosition: data.imagePosition || 'right',
        backgroundColor: data.backgroundColor || '#000000',
        backgroundGradient: data.backgroundGradient || '',
        textColor: data.textColor || '#ffffff',
        accentColor: data.accentColor || '',
        fontSize: data.fontSize || 'medium',
        fontWeight: data.fontWeight || '600',
        textAlign: data.textAlign || 'center',
        glowEffect: data.glowEffect || false,
        textGlow: data.textGlow || false,
        animationType: data.animationType || 'fade',
        animationSpeed: data.animationSpeed || 'medium',
        marqueeDirection: data.marqueeDirection || 'left',
        dismissible: data.dismissible !== undefined ? data.dismissible : true,
        startDate: data.startDate || '',
        endDate: data.endDate || ''
      };
    }

    // Return default settings if document doesn't exist
    return {
      enabled: false,
      title: '',
      subtitle: '',
      accentWord: '',
      ctaLabel: '',
      ctaUrl: '',
      ctaStyle: 'pill',
      ctaColor: '',
      image: '',
      imagePosition: 'right',
      backgroundColor: '#000000',
      backgroundGradient: '',
      textColor: '#ffffff',
      accentColor: '',
      fontSize: 'medium',
      fontWeight: '600',
      textAlign: 'center',
      glowEffect: false,
      textGlow: false,
      animationType: 'fade',
      animationSpeed: 'medium',
      marqueeDirection: 'left',
      dismissible: true,
      startDate: '',
      endDate: ''
    };
  } catch (error) {
    console.error('Error getting promo banner settings:', error);
    return null;
  }
};
