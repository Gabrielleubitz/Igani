'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Info,
  Target,
  Heart,
  Users,
  Lightbulb,
  Award,
  Settings as SettingsIcon,
  Eye,
  EyeOff
} from 'lucide-react'
import { z } from 'zod'
import {
  getAboutUsSections,
  getAboutUsSettings,
  saveAboutUsSection,
  updateAboutUsSection,
  deleteAboutUsSection,
  saveAboutUsSettings,
  getTeamMembers,
  saveTeamMember,
  updateTeamMember,
  deleteTeamMember
} from '@/lib/firestore'
import { AboutUsSection, AboutUsSettings, TeamMember } from '@/types'
import { AdminImageField } from '@/components/admin/AdminImageField'

const sectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['hero', 'mission', 'values', 'team', 'story', 'custom']),
  order: z.number().min(1),
  published: z.boolean()
})

const settingsSchema = z.object({
  pageTitle: z.string().min(1, 'Page title is required'),
  pageSubtitle: z.string().min(1, 'Page subtitle is required'),
  metaDescription: z.string().min(1, 'Meta description is required'),
  heroImage: z.string().optional(),
  teamSectionTitle: z.string().optional()
})

const teamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  position: z.string().min(1, 'Position is required'),
  bio: z.string().min(1, 'Bio is required'),
  imageUrl: z.string().optional(),
  phone: z.string().optional(),
  instagramUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  order: z.number().min(0),
  published: z.boolean()
})

type TabType = 'sections' | 'team' | 'settings'

export function AboutUsManager() {
  const [activeTab, setActiveTab] = useState<TabType>('sections')
  const [sections, setSections] = useState<AboutUsSection[]>([])
  const [settings, setSettings] = useState<AboutUsSettings>({
    pageTitle: 'About IGANI',
    pageSubtitle: 'Crafting digital experiences with passion and precision',
    metaDescription: 'Learn about IGANI - your trusted partner for premium web development and digital solutions.'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<AboutUsSection | null>(null)
  const [editingSettings, setEditingSettings] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [editingTeamMember, setEditingTeamMember] = useState<TeamMember | null>(null)
  const [isCreatingTeamMember, setIsCreatingTeamMember] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [sectionsData, settingsData, teamData] = await Promise.all([
        getAboutUsSections(),
        getAboutUsSettings(),
        getTeamMembers()
      ])
      setSections(sectionsData.sort((a, b) => a.order - b.order))
      setTeamMembers(teamData.sort((a, b) => a.order - b.order))
      if (settingsData) {
        setSettings(settingsData)
      }
    } catch (error) {
      console.error('Error loading about us data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'mission': return Target
      case 'values': return Heart
      case 'team': return Users
      case 'story': return Lightbulb
      default: return Award
    }
  }

  const getSectionTypeColor = (type: string) => {
    switch (type) {
      case 'mission': return 'bg-blue-500/20 text-blue-400'
      case 'values': return 'bg-red-500/20 text-red-400'
      case 'team': return 'bg-green-500/20 text-green-400'
      case 'story': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-purple-500/20 text-purple-400'
    }
  }

  const handleCreateSection = () => {
    const newSection: Partial<AboutUsSection> = {
      title: '',
      content: '',
      type: 'custom',
      order: Math.max(...sections.map(s => s.order), 0) + 1,
      published: true
    }
    setEditingSection(newSection as AboutUsSection)
    setIsCreating(true)
    setErrors({})
  }

  const handleEditSection = (section: AboutUsSection) => {
    setEditingSection({ ...section })
    setIsCreating(false)
    setErrors({})
  }

  const handleSaveSection = async () => {
    if (!editingSection) return
    try {
      const validatedData = sectionSchema.parse(editingSection)
      if (isCreating) {
        await saveAboutUsSection(validatedData)
      } else {
        await updateAboutUsSection(editingSection)
      }
      await loadData()
      setEditingSection(null)
      setIsCreating(false)
      setErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        console.error('Error saving section:', error)
      }
    }
  }

  const handleDeleteSection = async (id: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      try {
        await deleteAboutUsSection(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting section:', error)
      }
    }
  }

  const handleSaveSettings = async () => {
    try {
      const validatedData = settingsSchema.parse(settings)
      await saveAboutUsSettings(validatedData)
      setEditingSettings(false)
      setErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        console.error('Error saving settings:', error)
      }
    }
  }

  const handleCreateTeamMember = () => {
    setEditingTeamMember({
      id: '',
      name: '',
      position: '',
      bio: '',
      imageUrl: '',
      phone: '',
      instagramUrl: '',
      linkedinUrl: '',
      order: Math.max(...teamMembers.map(m => m.order), 0) + 1,
      published: true
    })
    setIsCreatingTeamMember(true)
    setErrors({})
  }

  const handleEditTeamMember = (member: TeamMember) => {
    setEditingTeamMember({ ...member })
    setIsCreatingTeamMember(false)
    setErrors({})
  }

  const handleSaveTeamMember = async () => {
    if (!editingTeamMember) return
    try {
      const validated = teamMemberSchema.parse({
        name: editingTeamMember.name,
        position: editingTeamMember.position,
        bio: editingTeamMember.bio,
        imageUrl: editingTeamMember.imageUrl || undefined,
        phone: editingTeamMember.phone?.trim() || undefined,
        instagramUrl: editingTeamMember.instagramUrl?.trim() || undefined,
        linkedinUrl: editingTeamMember.linkedinUrl?.trim() || undefined,
        order: editingTeamMember.order,
        published: editingTeamMember.published
      })
      if (isCreatingTeamMember) {
        await saveTeamMember(validated)
      } else {
        await updateTeamMember({ ...editingTeamMember, ...validated })
      }
      await loadData()
      setEditingTeamMember(null)
      setIsCreatingTeamMember(false)
      setErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        console.error('Error saving team member:', error)
      }
    }
  }

  const handleDeleteTeamMember = async (id: string) => {
    if (!confirm('Delete this team member?')) return
    try {
      await deleteTeamMember(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting team member:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading About Us...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('sections')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'sections'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Info className="w-4 h-4" />
          Content Sections ({sections.length})
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'team'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          Team Members ({teamMembers.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
            activeTab === 'settings'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          Page Settings
        </button>
      </div>

      {/* Content Sections */}
      {activeTab === 'sections' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Content Sections</h2>
            <button
              onClick={handleCreateSection}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          </div>
          <div className="space-y-4">
            {sections.map((section) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 flex items-start justify-between"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    {(() => {
                      const Icon = getSectionIcon(section.type)
                      return <Icon className="w-5 h-5 text-cyan-400" />
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">{section.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSectionTypeColor(section.type)}`}>
                        {section.type}
                      </span>
                      <div className="flex items-center gap-1">
                        {section.published ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                        <span className="text-xs text-slate-400">Order: {section.order}</span>
                      </div>
                    </div>
                    <div
                      className="text-slate-300 text-sm line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: section.content.substring(0, 200) + (section.content.length > 200 ? '...' : '') }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleEditSection(section)} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteSection(section.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
            {sections.length === 0 && (
              <div className="text-center py-12">
                <Info className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No sections yet</p>
                <button onClick={handleCreateSection} className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                  Create first section
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team Members */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Team Members</h2>
            <button
              onClick={handleCreateTeamMember}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Team Member
            </button>
          </div>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {member.imageUrl ? (
                    <img src={member.imageUrl} alt={member.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-slate-700" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Users className="w-8 h-8 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                    <p className="text-cyan-400 text-sm font-medium">{member.position}</p>
                    <p className="text-slate-300 text-sm mt-1 line-clamp-2">{member.bio}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-500">Order: {member.order}</span>
                      {member.published ? <Eye className="w-4 h-4 text-green-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleEditTeamMember(member)} className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteTeamMember(member.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
            {teamMembers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No team members yet</p>
                <button onClick={handleCreateTeamMember} className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                  Add first team member
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Page Settings */}
      {activeTab === 'settings' && (
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Page Settings</h2>
            {editingSettings ? (
              <div className="flex gap-2">
                <button onClick={handleSaveSettings} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <Save className="w-4 h-4" /> Save
                </button>
                <button
                  onClick={() => { setEditingSettings(false); setErrors({}); loadData(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setEditingSettings(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                <Edit2 className="w-4 h-4" /> Edit Settings
              </button>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">Page Title</label>
              <input
                type="text"
                value={settings.pageTitle}
                onChange={(e) => setSettings(prev => ({ ...prev, pageTitle: e.target.value }))}
                disabled={!editingSettings}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500 disabled:opacity-50"
                placeholder="About IGANI"
              />
              {errors.pageTitle && <p className="text-red-400 text-sm mt-1">{errors.pageTitle}</p>}
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Page Subtitle</label>
              <input
                type="text"
                value={settings.pageSubtitle}
                onChange={(e) => setSettings(prev => ({ ...prev, pageSubtitle: e.target.value }))}
                disabled={!editingSettings}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500 disabled:opacity-50"
                placeholder="Crafting digital experiences with passion and precision"
              />
              {errors.pageSubtitle && <p className="text-red-400 text-sm mt-1">{errors.pageSubtitle}</p>}
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Meta Description</label>
              <textarea
                value={settings.metaDescription}
                onChange={(e) => setSettings(prev => ({ ...prev, metaDescription: e.target.value }))}
                disabled={!editingSettings}
                rows={3}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500 disabled:opacity-50"
              />
              {errors.metaDescription && <p className="text-red-400 text-sm mt-1">{errors.metaDescription}</p>}
            </div>
            <div>
              <AdminImageField
                label="Hero Image (Optional)"
                value={settings.heroImage || ''}
                onChange={(url) => setSettings(prev => ({ ...prev, heroImage: url }))}
                disabled={!editingSettings}
                placeholder="https://example.com/hero-image.jpg"
                previewSize="lg"
              />
            </div>
            <div>
              <label className="block text-white font-medium mb-2">Team Section Title (Optional)</label>
              <input
                type="text"
                value={settings.teamSectionTitle || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, teamSectionTitle: e.target.value }))}
                disabled={!editingSettings}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500 disabled:opacity-50"
                placeholder="Our Team"
              />
              <p className="text-slate-500 text-sm mt-1">Heading above team members on the About page.</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{isCreating ? 'Create New Section' : 'Edit Section'}</h2>
              <button onClick={() => { setEditingSection(null); setIsCreating(false); setErrors({}); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={editingSection.title}
                    onChange={(e) => setEditingSection(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    placeholder="Section Title"
                  />
                  {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Type</label>
                  <select
                    value={editingSection.type}
                    onChange={(e) => setEditingSection(prev => prev ? { ...prev, type: e.target.value as AboutUsSection['type'] } : null)}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                  >
                    <option value="mission">Mission</option>
                    <option value="values">Values</option>
                    <option value="team">Team</option>
                    <option value="story">Story</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Order</label>
                  <input
                    type="number"
                    min={1}
                    value={editingSection.order}
                    onChange={(e) => setEditingSection(prev => prev ? { ...prev, order: parseInt(e.target.value) || 1 } : null)}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-white font-medium">
                    <input
                      type="checkbox"
                      checked={editingSection.published}
                      onChange={(e) => setEditingSection(prev => prev ? { ...prev, published: e.target.checked } : null)}
                      className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-600 rounded focus:ring-cyan-500"
                    />
                    Published
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Content (HTML Supported)</label>
                <textarea
                  value={editingSection.content}
                  onChange={(e) => setEditingSection(prev => prev ? { ...prev, content: e.target.value } : null)}
                  rows={12}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white font-mono text-sm"
                  placeholder="<p>Your content here...</p>"
                />
                {errors.content && <p className="text-red-400 text-sm mt-1">{errors.content}</p>}
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => { setEditingSection(null); setIsCreating(false); setErrors({}); }} className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
                  Cancel
                </button>
                <button onClick={handleSaveSection} className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                  {isCreating ? 'Create Section' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Team Member Modal */}
      {editingTeamMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">{isCreatingTeamMember ? 'Add Team Member' : 'Edit Team Member'}</h2>
              <button onClick={() => { setEditingTeamMember(null); setIsCreatingTeamMember(false); setErrors({}); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Name *</label>
                  <input
                    type="text"
                    value={editingTeamMember.name}
                    onChange={(e) => setEditingTeamMember(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    placeholder="Full name"
                  />
                  {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Position *</label>
                  <input
                    type="text"
                    value={editingTeamMember.position}
                    onChange={(e) => setEditingTeamMember(prev => prev ? { ...prev, position: e.target.value } : null)}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    placeholder="e.g. Co-Founder"
                  />
                  {errors.position && <p className="text-red-400 text-sm mt-1">{errors.position}</p>}
                </div>
              </div>
              <div>
                <AdminImageField
                  label="Image (Optional)"
                  value={editingTeamMember.imageUrl || ''}
                  onChange={(url) => setEditingTeamMember(prev => prev ? { ...prev, imageUrl: url } : null)}
                  placeholder="https://example.com/photo.jpg"
                  previewSize="md"
                />
              </div>
              <div>
                <label className="block text-white font-medium mb-2">Bio *</label>
                <textarea
                  value={editingTeamMember.bio}
                  onChange={(e) => setEditingTeamMember(prev => prev ? { ...prev, bio: e.target.value } : null)}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                  placeholder="Short bio..."
                />
                {errors.bio && <p className="text-red-400 text-sm mt-1">{errors.bio}</p>}
              </div>
              <div className="rounded-lg border border-slate-600/60 bg-slate-900/30 p-4 space-y-3">
                <p className="text-slate-300 text-sm font-medium">Contact (shown on hover on About page)</p>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">WhatsApp number</label>
                  <input
                    type="text"
                    value={editingTeamMember.phone || ''}
                    onChange={(e) => setEditingTeamMember(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white text-sm"
                    placeholder="+972501234567 (country code + number, any format)"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Instagram URL</label>
                  <input
                    type="url"
                    value={editingTeamMember.instagramUrl || ''}
                    onChange={(e) => setEditingTeamMember(prev => prev ? { ...prev, instagramUrl: e.target.value } : null)}
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white text-sm"
                    placeholder="https://www.instagram.com/username"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-sm mb-1">LinkedIn URL</label>
                  <input
                    type="url"
                    value={editingTeamMember.linkedinUrl || ''}
                    onChange={(e) => setEditingTeamMember(prev => prev ? { ...prev, linkedinUrl: e.target.value } : null)}
                    className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white text-sm"
                    placeholder="https://www.linkedin.com/in/username"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Order</label>
                  <input
                    type="number"
                    min={0}
                    value={editingTeamMember.order}
                    onChange={(e) => setEditingTeamMember(prev => prev ? { ...prev, order: parseInt(e.target.value) || 0 } : null)}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                  />
                </div>
                <div className="flex items-center pt-8">
                  <label className="flex items-center gap-2 text-white font-medium">
                    <input
                      type="checkbox"
                      checked={editingTeamMember.published}
                      onChange={(e) => setEditingTeamMember(prev => prev ? { ...prev, published: e.target.checked } : null)}
                      className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-600 rounded focus:ring-cyan-500"
                    />
                    Published
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button onClick={() => { setEditingTeamMember(null); setIsCreatingTeamMember(false); setErrors({}); }} className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700">
                  Cancel
                </button>
                <button onClick={handleSaveTeamMember} className="px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                  {isCreatingTeamMember ? 'Add Team Member' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
