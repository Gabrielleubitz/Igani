'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, Save, X, Star, ExternalLink } from 'lucide-react'
import { Website } from '@/types'
import { saveWebsite, updateWebsite, deleteWebsite } from '@/lib/firestore'

interface WebsiteManagerProps {
  websites: Website[]
  onUpdate: () => void
}

export function WebsiteManager({ websites, onUpdate }: WebsiteManagerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    category: '',
    image: '',
    featured: false
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleEdit = (website: Website) => {
    setEditingWebsite(website)
    setFormData({
      title: website.title,
      description: website.description,
      url: website.url,
      category: website.category,
      image: website.image,
      featured: website.featured
    })
    setIsEditing(true)
  }

  const handleNew = () => {
    setEditingWebsite(null)
    setFormData({
      title: '',
      description: '',
      url: '',
      category: '',
      image: '',
      featured: false
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingWebsite(null)
    setFormData({
      title: '',
      description: '',
      url: '',
      category: '',
      image: '',
      featured: false
    })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      if (editingWebsite) {
        // Update existing website
        await updateWebsite({
          ...editingWebsite,
          ...formData
        })
      } else {
        // Create new website
        await saveWebsite(formData)
      }

      await onUpdate()
      handleCancel()
    } catch (error) {
      console.error('Error saving website:', error)
      alert('Failed to save website. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this website?')) {
      return
    }

    try {
      await deleteWebsite(id)
      await onUpdate()
    } catch (error) {
      console.error('Error deleting website:', error)
      alert('Failed to delete website. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Portfolio Websites</h2>
        {!isEditing && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Website
          </button>
        )}
      </div>

      {/* Edit Form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-800/80 border border-cyan-500/50 rounded-2xl p-8 shadow-2xl shadow-cyan-500/20"
          >
            <h3 className="text-xl font-bold text-white mb-6">
              {editingWebsite ? 'Edit Website' : 'Add New Website'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
                    placeholder="Website title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
                    placeholder="e.g., SaaS, E-commerce"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 resize-none"
                  placeholder="Brief description of the project"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Website URL *
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Image URL *
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
                  placeholder="https://example.com/image.jpg"
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-5 h-5 text-cyan-600 bg-slate-900/60 border-slate-600 rounded focus:ring-cyan-500"
                />
                <label htmlFor="featured" className="text-white font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Mark as Featured
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {isSaving ? 'Saving...' : 'Save Website'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Websites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {websites.map((website) => (
          <motion.div
            key={website.id}
            layout
            className="group relative bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300"
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden">
              <img
                src={website.image}
                alt={website.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
              {website.featured && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-xl">
                  ⭐ Featured
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <span className="inline-block bg-cyan-500/10 text-cyan-400 text-xs px-3 py-1.5 rounded-full font-bold border border-cyan-500/30 mb-3">
                {website.category}
              </span>
              <h3 className="text-lg font-bold text-white mb-2">{website.title}</h3>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                {website.description}
              </p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(website)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-300 text-sm font-semibold"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <a
                  href={website.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors duration-300"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(website.id)}
                  className="flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {websites.length === 0 && !isEditing && (
        <div className="text-center py-16 bg-slate-800/60 rounded-2xl border border-slate-700/50">
          <p className="text-slate-400 text-lg mb-4">No websites yet</p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Your First Website
          </button>
        </div>
      )}
    </div>
  )
}
