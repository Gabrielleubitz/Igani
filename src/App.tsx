import React, { useState } from 'react';
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

  // Load websites from localStorage on component mount
  React.useEffect(() => {
    const savedWebsites = localStorage.getItem('igani-websites');
    const savedSettings = localStorage.getItem('igani-settings');
    const savedSubmissions = localStorage.getItem('igani-submissions');
    
    if (savedWebsites) {
      try {
        const parsedWebsites = JSON.parse(savedWebsites);
        setWebsites(parsedWebsites);
      } catch (error) {
        console.error('Error loading saved websites:', error);
      }
    }
    
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    }
    
    if (savedSubmissions) {
      try {
        const parsedSubmissions = JSON.parse(savedSubmissions);
        setContactSubmissions(parsedSubmissions);
      } catch (error) {
        console.error('Error loading saved submissions:', error);
      }
    }
  }, []);

  // Save websites to localStorage whenever websites change
  React.useEffect(() => {
    localStorage.setItem('igani-websites', JSON.stringify(websites));
  }, [websites]);
  
  // Save settings to localStorage whenever settings change
  React.useEffect(() => {
    localStorage.setItem('igani-settings', JSON.stringify(settings));
  }, [settings]);
  
  // Save submissions to localStorage whenever submissions change
  React.useEffect(() => {
    localStorage.setItem('igani-submissions', JSON.stringify(contactSubmissions));
  }, [contactSubmissions]);
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

  const updateSettings = (newSettings: SiteSettings) => {
    setSettings(newSettings);
  };

  const addContactSubmission = (submissionData: Omit<ContactSubmission, 'id' | 'submittedAt' | 'status'>) => {
    const newSubmission: ContactSubmission = {
      ...submissionData,
      id: Date.now().toString(),
      submittedAt: new Date().toISOString(),
      status: 'new'
    };
    setContactSubmissions([newSubmission, ...contactSubmissions]);
  };

  const markSubmissionRead = (id: string) => {
    setContactSubmissions(contactSubmissions.map(sub => 
      sub.id === id ? { ...sub, status: 'read' as const } : sub
    ));
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