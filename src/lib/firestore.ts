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
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { SiteSettings, ContactSubmission } from '../types';

// Collections
const SETTINGS_COLLECTION = 'settings';
const CONTACT_SUBMISSIONS_COLLECTION = 'contactSubmissions';

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
    const settingsRef = doc(db, SETTINGS_COLLECTION, 'main');
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
        id: docSnap.id
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
  submission: Omit<ContactSubmission, 'id' | 'submittedAt' | 'status'>
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, CONTACT_SUBMISSIONS_COLLECTION), {
      ...submission,
      submittedAt: Timestamp.now(),
      status: 'new' as const
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
      submissions.push({
        id: doc.id,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        projectType: data.projectType,
        message: data.message,
        submittedAt: data.submittedAt.toDate().toISOString(),
        status: data.status
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
  status: ContactSubmission['status']
): Promise<void> => {
  try {
    const submissionRef = doc(db, CONTACT_SUBMISSIONS_COLLECTION, id);
    await updateDoc(submissionRef, {
      status,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating submission status:', error);
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