import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  Settings, 
  Mail, 
  BarChart3, 
  Users, 
  Eye,
  MessageSquare,
  Palette,
  Save,
  RefreshCw
} from 'lucide-react';
import { Website, SiteSettings, ContactSubmission } from '../types';

interface AdminDashboardProps {
  websites: Website[];
  settings: SiteSettings;
  contactSubmissions: ContactSubmission[];
  onClose: () => void;
  onAddWebsite: (website: Omit<Website, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteWebsite: (id: string) => Promise<void>;
  onUpdateWebsite: (website: Website) => Promise<void>;
  onUpdateSettings: (settings: SiteSettings) => Promise<void>;
  onMarkSubmissionRead: (id: string) => Promise<void>;
}

type TabType = 'overview' | 'websites' | 'settings' | 'messages' | 'analytics';

export function AdminDashboard({ 
  websites, 
  settings, 
  contactSubmissions,
  onClose, 
  onAddWebsite, 
  onDeleteWebsite, 
  onUpdateWebsite,
  onUpdateSettings,
  onMarkSubmissionRead
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showWebsiteForm, setShowWebsiteForm] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [settingsForm, setSettingsForm] = useState(settings);

  // Sync settings form with settings prop when it changes
  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Handle click outside to close
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  const [websiteForm, setWebsiteForm] = useState({
    title: '',
    description: '',
    url: '',
    category: '',
    image: '',
    featured: false
  });

  const resetWebsiteForm = () => {
    setWebsiteForm({
      title: '',
      description: '',
      url: '',
      category: '',
      image: '',
      featured: false
    });
    setShowWebsiteForm(false);
    setEditingWebsite(null);
  };

  const handleWebsiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!websiteForm.title.trim() || !websiteForm.description.trim() || !websiteForm.url.trim() || !websiteForm.category.trim() || !websiteForm.image.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      new URL(websiteForm.url);
      new URL(websiteForm.image);
    } catch {
      alert('Please enter valid URLs for website and image');
      return;
    }
    
    try {
      if (editingWebsite) {
        await onUpdateWebsite({
          ...editingWebsite,
          ...websiteForm
        });
      } else {
        await onAddWebsite(websiteForm);
      }
      resetWebsiteForm();
    } catch (error) {
      console.error('Error saving website:', error);
      alert('Failed to save website. Please try again.');
    }
  };

  const startEditWebsite = (website: Website) => {
    setEditingWebsite(website);
    setWebsiteForm({
      title: website.title,
      description: website.description,
      url: website.url,
      category: website.category,
      image: website.image,
      featured: website.featured
    });
    setShowWebsiteForm(true);
  };

  const handleDeleteWebsite = async (website: Website) => {
    if (window.confirm(`Are you sure you want to delete "${website.title}"?`)) {
      try {
        await onDeleteWebsite(website.id);
      } catch (error) {
        console.error('Error deleting website:', error);
        alert('Failed to delete website. Please try again.');
      }
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onUpdateSettings(settingsForm);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const unreadMessages = contactSubmissions.filter(sub => sub.status === 'new').length;
  const totalViews = websites.reduce((acc, site) => acc + Math.floor(Math.random() * 1000) + 100, 0);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Websites</p>
              <p className="text-3xl font-bold">{websites.length}</p>
            </div>
            <Globe className="w-8 h-8 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Total Views</p>
              <p className="text-3xl font-bold">{totalViews.toLocaleString()}</p>
            </div>
            <Eye className="w-8 h-8 text-green-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Messages</p>
              <p className="text-3xl font-bold">{contactSubmissions.length}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-purple-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">Unread</p>
              <p className="text-3xl font-bold">{unreadMessages}</p>
            </div>
            <Mail className="w-8 h-8 text-orange-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Recent Websites</h3>
          <div className="space-y-3">
            {websites.slice(0, 5).map((website) => (
              <div key={website.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <img src={website.image} alt={website.title} className="w-12 h-12 object-cover rounded-lg" />
                <div className="flex-1">
                  <p className="font-medium">{website.title}</p>
                  <p className="text-sm text-gray-600">{website.category}</p>
                </div>
                {website.featured && (
                  <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                    Featured
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Recent Messages</h3>
          <div className="space-y-3">
            {contactSubmissions.slice(0, 5).map((submission) => (
              <div key={submission.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{submission.firstName} {submission.lastName}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    submission.status === 'new' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {submission.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">{submission.message}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(submission.submittedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderWebsites = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Manage Websites</h3>
        <button
          onClick={() => setShowWebsiteForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Globe className="w-4 h-4" />
          <span>Add Website</span>
        </button>
      </div>

      {showWebsiteForm && (
        <div className="bg-gray-50 p-6 rounded-xl">
          <h4 className="text-lg font-semibold mb-4">
            {editingWebsite ? 'Edit Website' : 'Add New Website'}
          </h4>
          <form onSubmit={handleWebsiteSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={websiteForm.title}
                  onChange={(e) => setWebsiteForm({...websiteForm, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <input
                  type="text"
                  value={websiteForm.category}
                  onChange={(e) => setWebsiteForm({...websiteForm, category: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={websiteForm.description}
                onChange={(e) => setWebsiteForm({...websiteForm, description: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                <input
                  type="url"
                  value={websiteForm.url}
                  onChange={(e) => setWebsiteForm({...websiteForm, url: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image URL</label>
                <input
                  type="url"
                  value={websiteForm.image}
                  onChange={(e) => setWebsiteForm({...websiteForm, image: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="featured"
                checked={websiteForm.featured}
                onChange={(e) => setWebsiteForm({...websiteForm, featured: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="featured" className="text-sm font-medium text-gray-700">Featured Website</label>
            </div>
            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{editingWebsite ? 'Update' : 'Add'} Website</span>
              </button>
              <button
                type="button"
                onClick={resetWebsiteForm}
                className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {websites.map((website) => (
          <div key={website.id} className="bg-white p-4 rounded-lg shadow-sm border flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={website.image} alt={website.title} className="w-16 h-16 object-cover rounded-lg" />
              <div>
                <h4 className="font-semibold">{website.title}</h4>
                <p className="text-sm text-gray-600">{website.category}</p>
                <p className="text-xs text-gray-500">{website.createdAt}</p>
                {website.featured && (
                  <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full mt-1">
                    Featured
                  </span>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => startEditWebsite(website)}
                className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-200 hover:bg-blue-50"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteWebsite(website)}
                className="text-red-600 hover:text-red-800 px-3 py-1 rounded border border-red-200 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Site Settings</h3>
      <form onSubmit={handleSettingsSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold mb-4">General Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
              <input
                type="text"
                value={settingsForm.siteName}
                onChange={(e) => setSettingsForm({...settingsForm, siteName: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tagline</label>
              <input
                type="text"
                value={settingsForm.tagline}
                onChange={(e) => setSettingsForm({...settingsForm, tagline: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold mb-4">Hero Section</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hero Title</label>
              <input
                type="text"
                value={settingsForm.heroTitle}
                onChange={(e) => setSettingsForm({...settingsForm, heroTitle: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hero Subtitle</label>
              <textarea
                value={settingsForm.heroSubtitle}
                onChange={(e) => setSettingsForm({...settingsForm, heroSubtitle: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold mb-4">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={settingsForm.contactEmail}
                onChange={(e) => setSettingsForm({...settingsForm, contactEmail: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={settingsForm.contactPhone}
                onChange={(e) => setSettingsForm({...settingsForm, contactPhone: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={settingsForm.contactLocation}
                onChange={(e) => setSettingsForm({...settingsForm, contactLocation: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold mb-4">SEO Settings</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SEO Title</label>
              <input
                type="text"
                value={settingsForm.seoTitle}
                onChange={(e) => setSettingsForm({...settingsForm, seoTitle: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SEO Description</label>
              <textarea
                value={settingsForm.seoDescription}
                onChange={(e) => setSettingsForm({...settingsForm, seoDescription: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Settings</span>
        </button>
      </form>
    </div>
  );

  const renderMessages = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Contact Messages</h3>
      <div className="space-y-4">
        {contactSubmissions.map((submission) => (
          <div key={submission.id} className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-lg">{submission.firstName} {submission.lastName}</h4>
                <p className="text-gray-600">{submission.email}</p>
                <p className="text-sm text-gray-500">{new Date(submission.submittedAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  submission.status === 'new' ? 'bg-red-100 text-red-800' : 
                  submission.status === 'read' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {submission.status}
                </span>
                {submission.status === 'new' && (
                  <button
                    onClick={async () => {
                      try {
                        await onMarkSubmissionRead(submission.id);
                      } catch (error) {
                        console.error('Error marking message as read:', error);
                        alert('Failed to mark message as read.');
                      }
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Project Type: <span className="font-medium">{submission.projectType}</span></p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-800">{submission.message}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <a
                href={`mailto:${submission.email}?subject=Re: Your inquiry about ${submission.projectType}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Reply via Email
              </a>
            </div>
          </div>
        ))}
        {contactSubmissions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No messages yet</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Analytics Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold mb-4">Website Performance</h4>
          <div className="space-y-4">
            {websites.map((website) => (
              <div key={website.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <img src={website.image} alt={website.title} className="w-10 h-10 object-cover rounded" />
                  <div>
                    <p className="font-medium text-sm">{website.title}</p>
                    <p className="text-xs text-gray-600">{website.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{Math.floor(Math.random() * 500) + 50}</p>
                  <p className="text-xs text-gray-600">views</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h4 className="text-lg font-semibold mb-4">Recent Activity</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <p className="text-sm">New website added: {websites[0]?.title}</p>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <p className="text-sm">Contact form submission received</p>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <p className="text-sm">Settings updated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'websites', label: 'Websites', icon: Globe },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex"
      onClick={handleBackdropClick}
    >
      <div className="bg-white w-full max-w-7xl mx-auto my-4 rounded-2xl shadow-2xl overflow-hidden flex relative">
        {/* Top-right close button for extra visibility */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all duration-200 z-20"
          title="Close Admin Panel"
        >
          <X className="w-6 h-6" />
        </button>
        {/* Sidebar */}
        <div className="w-64 bg-gray-900 text-white p-6">
          <div className="flex items-center space-x-2 mb-8">
            <Settings className="w-8 h-8 text-blue-400" />
            <h2 className="text-xl font-bold">Admin Panel</h2>
          </div>
          
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.badge && tab.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-auto">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h1>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all duration-200 z-10 relative"
              title="Close Admin Panel"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 p-6 overflow-auto">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'websites' && renderWebsites()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'messages' && renderMessages()}
            {activeTab === 'analytics' && renderAnalytics()}
          </div>
        </div>
      </div>
    </div>
  );
}