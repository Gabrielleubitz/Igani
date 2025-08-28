import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Portfolio } from './components/Portfolio';
import { ServicesGrid } from './components/ui/services-grid';
import { ComponentsShowcase } from './components/ComponentsShowcase';
import { About } from './components/About';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { PreviewPage } from './components/PreviewPage';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { sampleWebsites } from './data/sampleWebsites';
import { defaultSettings } from './data/defaultSettings';
import { Website, SiteSettings, ContactSubmission } from './types';
import { 
  saveSettings, 
  getSettings, 
  saveContactSubmission, 
  getContactSubmissions,
  updateContactSubmissionStatus
} from './lib/firestore';

function HomePage({ 
  websites, 
  settings, 
  contactSubmissions, 
  showAdmin, 
  isAuthenticated,
  onAdminToggle,
  onAdminClose,
  handleAdminLogin,
  addContactSubmission,
  addWebsite,
  deleteWebsite,
  updateWebsite,
  updateSettings,
  markSubmissionRead
}: any) {
  return (
    <>
      <Header 
        settings={settings}
        onAdminToggle={onAdminToggle} 
        showAdmin={showAdmin}
      />
      <Hero settings={settings} />
      <section className="py-20 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ServicesGrid />
        </div>
      </section>
      <Portfolio websites={websites} />
      <ComponentsShowcase />
      <About settings={settings} />
      <Contact settings={settings} onSubmit={addContactSubmission} />
      <Footer settings={settings} />
      
      {showAdmin && !isAuthenticated && (
        <AdminLogin
          onLogin={handleAdminLogin}
          onClose={() => onAdminToggle()}
        />
      )}
      
      {showAdmin && isAuthenticated && (
        <AdminDashboard
          websites={websites}
          settings={settings}
          contactSubmissions={contactSubmissions}
          onClose={onAdminClose}
          onAddWebsite={addWebsite}
          onDeleteWebsite={deleteWebsite}
          onUpdateWebsite={updateWebsite}
          onUpdateSettings={updateSettings}
          onMarkSubmissionRead={markSubmissionRead}
        />
      )}
    </>
  );
}
function App() {
  const [websites, setWebsites] = useState<Website[]>(sampleWebsites);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [contactSubmissions, setContactSubmissions] = useState<ContactSubmission[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load data from Firebase on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load settings from Firebase
        const firebaseSettings = await getSettings();
        if (firebaseSettings) {
          setSettings(firebaseSettings);
        }
        
        // Load contact submissions from Firebase
        const submissions = await getContactSubmissions();
        setContactSubmissions(submissions);
        
        // Note: Websites are still using sample data for now
        // In future, you can implement website management in Firebase too
      } catch (error) {
        console.error('Error loading data from Firebase:', error);
      }
    };
    
    loadData();
  }, []);

  // Save settings to Firebase whenever settings change
  useEffect(() => {
    if (settings.companyName !== defaultSettings.companyName) {
      saveSettings(settings).catch(error => {
        console.error('Error saving settings to Firebase:', error);
      });
    }
  }, [settings]);
  const addWebsite = (websiteData: Omit<Website, 'id' | 'createdAt'>) => {
    const newWebsite: Website = {
      ...websiteData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setWebsites([...websites, newWebsite]);
  };

  const deleteWebsite = (id: string) => {
    setWebsites(websites.filter(w => w.id !== id));
  };

  const updateWebsite = (updatedWebsite: Website) => {
    setWebsites(websites.map(w => w.id === updatedWebsite.id ? updatedWebsite : w));
  };

  const updateSettings = async (newSettings: SiteSettings) => {
    setSettings(newSettings);
    try {
      await saveSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const addContactSubmission = async (submissionData: Omit<ContactSubmission, 'id' | 'submittedAt' | 'status'>) => {
    try {
      const submissionId = await saveContactSubmission(submissionData);
      const newSubmission: ContactSubmission = {
        ...submissionData,
        id: submissionId,
        submittedAt: new Date().toISOString(),
        status: 'new'
      };
      setContactSubmissions([newSubmission, ...contactSubmissions]);
    } catch (error) {
      console.error('Error saving contact submission:', error);
      throw error;
    }
  };

  const markSubmissionRead = async (id: string) => {
    try {
      await updateContactSubmissionStatus(id, 'read');
      setContactSubmissions(contactSubmissions.map(sub => 
        sub.id === id ? { ...sub, status: 'read' as const } : sub
      ));
    } catch (error) {
      console.error('Error updating submission status:', error);
    }
  };

  const handleAdminLogin = (password: string) => {
    // Simple password check - in production, use proper authentication
    if (password === 'admin123') {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const handleAdminClose = () => {
    setShowAdmin(false);
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Routes>
        <Route 
          path="/" 
          element={
            <HomePage 
              websites={websites}
              settings={settings}
              contactSubmissions={contactSubmissions}
              showAdmin={showAdmin}
              isAuthenticated={isAuthenticated}
              onAdminToggle={() => setShowAdmin(true)}
              onAdminClose={handleAdminClose}
              handleAdminLogin={handleAdminLogin}
              addContactSubmission={addContactSubmission}
              addWebsite={addWebsite}
              deleteWebsite={deleteWebsite}
              updateWebsite={updateWebsite}
              updateSettings={updateSettings}
              markSubmissionRead={markSubmissionRead}
            />
          } 
        />
        <Route 
          path="/preview" 
          element={<PreviewPage websites={websites} />} 
        />
      </Routes>
    </div>
  );
}

export default App;