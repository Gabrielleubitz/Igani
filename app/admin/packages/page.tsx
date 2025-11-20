'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Search,
  Eye, 
  EyeOff, 
  Save, 
  X, 
  GripVertical,
  Package,
  HelpCircle,
  Wrench,
  Download,
  ExternalLink,
  ArrowUpDown
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { z } from 'zod'
import {
  getPackages,
  getMaintenancePlans,
  getPackageFAQs,
  getPackageSettings,
  savePackage,
  updatePackage,
  deletePackage,
  saveMaintenancePlan,
  updateMaintenancePlan,
  deleteMaintenancePlan,
  savePackageFAQ,
  updatePackageFAQ,
  deletePackageFAQ,
  savePackageSettings
} from '@/lib/firestore'
import { Package as PackageType, MaintenancePlan, PackageFAQ, PackageSettings } from '@/types'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { seedPackages } from '@/scripts/seedPackages'

// Validation schemas
const packageSchema = z.object({
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  name: z.string().min(1, 'Name is required'),
  tagline: z.string().min(1, 'Tagline is required'),
  bestFor: z.string().min(1, 'Best For is required'),
  priceMin: z.number().min(0, 'Price Min must be positive'),
  priceMax: z.number().min(0, 'Price Max must be positive'),
  priceUnit: z.string().min(1, 'Price Unit is required'),
  delivery: z.string().min(1, 'Delivery is required'),
  includes: z.array(z.string().min(1)).min(1, 'At least one include is required'),
  addOns: z.array(z.object({
    name: z.string().min(1),
    priceNote: z.string().min(1)
  })),
  roundsOfRevisions: z.number().nullable(),
  order: z.number().min(1),
  published: z.boolean(),
  badge: z.enum(['best-seller', 'recommended', 'popular', 'new', '']).optional()
}).refine(data => data.priceMax >= data.priceMin, {
  message: "Price Max must be greater than or equal to Price Min",
  path: ["priceMax"]
})

const maintenanceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  priceNote: z.string().min(1, 'Price note is required'),
  includes: z.array(z.string().min(1)).min(1, 'At least one include is required'),
  order: z.number().min(1),
  published: z.boolean()
})

const faqSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  order: z.number().min(1),
  published: z.boolean()
})

type TabType = 'packages' | 'maintenance' | 'faqs'

interface SortableItemProps {
  id: string
  children: React.ReactNode
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center">
        <div {...listeners} className="cursor-grab active:cursor-grabbing p-2 text-slate-400 hover:text-white">
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function AdminPackagesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('packages')
  const [packages, setPackages] = useState<PackageType[]>([])
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>([])
  const [faqs, setFaqs] = useState<PackageFAQ[]>([])
  const [settings, setSettings] = useState<PackageSettings>({
    currencySymbol: '₪',
    showComparison: true,
    contactCtaText: 'Free Consultation',
    contactEmail: 'info@igani.co',
    calendlyUrl: ''
  })
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Form states
  const [packageForm, setPackageForm] = useState({
    slug: '',
    name: '',
    tagline: '',
    priceMin: 0,
    priceMax: 0,
    priceUnit: 'NIS',
    bestFor: '',
    includes: [''],
    addOns: [] as { name: string; priceNote: string }[],
    delivery: '',
    roundsOfRevisions: null as number | null,
    order: 1,
    published: true,
    badge: '' as 'best-seller' | 'recommended' | 'popular' | 'new' | ''
  })

  const [maintenanceForm, setMaintenanceForm] = useState({
    name: '',
    priceNote: '',
    includes: [''],
    order: 1,
    published: true
  })

  const [faqForm, setFaqForm] = useState({
    question: '',
    answer: '',
    order: 1,
    published: true
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadData()
  }, [])

  // Auto-generate slug from name
  useEffect(() => {
    if (!editingItem && packageForm.name) {
      const slug = packageForm.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setPackageForm(prev => ({ ...prev, slug }))
    }
  }, [packageForm.name, editingItem])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      const [packagesData, plansData, faqsData, settingsData] = await Promise.all([
        getPackages(),
        getMaintenancePlans(),
        getPackageFAQs(),
        getPackageSettings()
      ])

      setPackages(packagesData)
      setMaintenancePlans(plansData)
      setFaqs(faqsData)
      
      if (settingsData) {
        setSettings(settingsData)
      }
    } catch (error) {
      console.error('Error loading packages data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSeedData = async () => {
    if (!confirm('This will add default packages data. Are you sure?')) return
    
    try {
      setIsSeeding(true)
      await seedPackages()
      await loadData()
      alert('Default packages data loaded successfully!')
    } catch (error) {
      console.error('Error seeding data:', error)
      alert('Error loading default data. Please try again.')
    } finally {
      setIsSeeding(false)
    }
  }

  const resetForms = () => {
    setPackageForm({
      slug: '',
      name: '',
      tagline: '',
      priceMin: 0,
      priceMax: 0,
      priceUnit: 'NIS',
      bestFor: '',
      includes: [''],
      addOns: [],
      delivery: '',
      roundsOfRevisions: null,
      order: Math.max(...packages.map(p => p.order), 0) + 1,
      published: true,
      badge: ''
    })
    setMaintenanceForm({
      name: '',
      priceNote: '',
      includes: [''],
      order: Math.max(...maintenancePlans.map(p => p.order), 0) + 1,
      published: true
    })
    setFaqForm({
      question: '',
      answer: '',
      order: Math.max(...faqs.map(f => f.order), 0) + 1,
      published: true
    })
    setEditingItem(null)
    setShowForm(false)
    setValidationErrors({})
  }

  const handleEditPackage = (pkg: PackageType) => {
    setPackageForm({
      slug: pkg.slug,
      name: pkg.name,
      tagline: pkg.tagline,
      priceMin: pkg.priceMin,
      priceMax: pkg.priceMax,
      priceUnit: pkg.priceUnit,
      bestFor: pkg.bestFor,
      includes: pkg.includes,
      addOns: pkg.addOns,
      delivery: pkg.delivery,
      roundsOfRevisions: pkg.roundsOfRevisions,
      order: pkg.order,
      published: pkg.published,
      badge: pkg.badge || ''
    })
    setEditingItem(pkg)
    setActiveTab('packages')
    setShowForm(true)
    setValidationErrors({})
  }

  const handleEditMaintenance = (plan: MaintenancePlan) => {
    setMaintenanceForm({
      name: plan.name,
      priceNote: plan.price ? `${settings.currencySymbol}${plan.price}/month` : '',
      includes: plan.includes,
      order: plan.order,
      published: plan.published
    })
    setEditingItem(plan)
    setActiveTab('maintenance')
    setShowForm(true)
    setValidationErrors({})
  }

  const handleEditFAQ = (faq: PackageFAQ) => {
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      order: faq.order,
      published: faq.published
    })
    setEditingItem(faq)
    setActiveTab('faqs')
    setShowForm(true)
    setValidationErrors({})
  }

  const validateForm = (schema: z.ZodSchema, data: any) => {
    try {
      schema.parse(data)
      setValidationErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        setValidationErrors(errors)
      }
      return false
    }
  }

  const handleSubmitPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean up form data
    const cleanedForm = {
      ...packageForm,
      includes: packageForm.includes.filter(item => item.trim() !== ''),
      addOns: packageForm.addOns.filter(addon => addon.name.trim() !== '' && addon.priceNote.trim() !== '')
    }

    if (!validateForm(packageSchema, cleanedForm)) {
      return
    }

    setIsSaving(true)

    try {
      if (editingItem) {
        await updatePackage({
          ...editingItem,
          ...cleanedForm
        })
      } else {
        await savePackage(cleanedForm)
      }
      
      await loadData()
      resetForms()
    } catch (error) {
      console.error('Error saving package:', error)
      alert('Error saving package. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanedForm = {
      ...maintenanceForm,
      includes: maintenanceForm.includes.filter(item => item.trim() !== '')
    }

    if (!validateForm(maintenanceSchema, cleanedForm)) {
      return
    }

    setIsSaving(true)

    try {
      const formData = {
        name: cleanedForm.name,
        price: 0, // We'll extract this from priceNote if needed
        includes: cleanedForm.includes,
        order: cleanedForm.order,
        published: cleanedForm.published
      }

      if (editingItem) {
        await updateMaintenancePlan({
          ...editingItem,
          ...formData
        })
      } else {
        await saveMaintenancePlan(formData)
      }
      
      await loadData()
      resetForms()
    } catch (error) {
      console.error('Error saving maintenance plan:', error)
      alert('Error saving maintenance plan. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitFAQ = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm(faqSchema, faqForm)) {
      return
    }

    setIsSaving(true)

    try {
      if (editingItem) {
        await updatePackageFAQ({
          ...editingItem,
          ...faqForm
        })
      } else {
        await savePackageFAQ(faqForm)
      }
      
      await loadData()
      resetForms()
    } catch (error) {
      console.error('Error saving FAQ:', error)
      alert('Error saving FAQ. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTogglePublish = async (type: 'package' | 'maintenance' | 'faq', item: any) => {
    try {
      const updatedItem = { ...item, published: !item.published }
      
      if (type === 'package') {
        await updatePackage(updatedItem)
      } else if (type === 'maintenance') {
        await updateMaintenancePlan(updatedItem)
      } else {
        await updatePackageFAQ(updatedItem)
      }
      
      await loadData()
    } catch (error) {
      console.error('Error toggling publish status:', error)
      alert('Error updating publish status. Please try again.')
    }
  }

  const handleDelete = async (type: 'package' | 'maintenance' | 'faq', id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return
    
    try {
      if (type === 'package') {
        await deletePackage(id)
      } else if (type === 'maintenance') {
        await deleteMaintenancePlan(id)
      } else {
        await deletePackageFAQ(id)
      }
      
      await loadData()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error deleting item. Please try again.')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    try {
      if (activeTab === 'packages') {
        const oldIndex = packages.findIndex(p => p.id === active.id)
        const newIndex = packages.findIndex(p => p.id === over.id)
        
        const newPackages = arrayMove(packages, oldIndex, newIndex)
        setPackages(newPackages)

        // Update order in Firestore
        for (let i = 0; i < newPackages.length; i++) {
          await updatePackage({ ...newPackages[i], order: i + 1 })
        }
      } else if (activeTab === 'maintenance') {
        const oldIndex = maintenancePlans.findIndex(p => p.id === active.id)
        const newIndex = maintenancePlans.findIndex(p => p.id === over.id)
        
        const newPlans = arrayMove(maintenancePlans, oldIndex, newIndex)
        setMaintenancePlans(newPlans)

        for (let i = 0; i < newPlans.length; i++) {
          await updateMaintenancePlan({ ...newPlans[i], order: i + 1 })
        }
      } else if (activeTab === 'faqs') {
        const oldIndex = faqs.findIndex(f => f.id === active.id)
        const newIndex = faqs.findIndex(f => f.id === over.id)
        
        const newFaqs = arrayMove(faqs, oldIndex, newIndex)
        setFaqs(newFaqs)

        for (let i = 0; i < newFaqs.length; i++) {
          await updatePackageFAQ({ ...newFaqs[i], order: i + 1 })
        }
      }
    } catch (error) {
      console.error('Error reordering items:', error)
      alert('Error reordering items. Please refresh and try again.')
      await loadData()
    }
  }

  // Filter items based on search
  const filteredPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.tagline.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredMaintenancePlans = maintenancePlans.filter(plan =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading packages admin...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Splash Cursor Animation - Full Page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Packages Management</h1>
            <p className="text-slate-400 mt-2">Manage packages, maintenance plans, and FAQs</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {isSeeding ? 'Loading...' : 'Load Default Data'}
            </button>
            <a
              href="/packages"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Preview Page
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-slate-800/60 p-1 rounded-lg w-fit">
          {[
            { id: 'packages', label: 'Packages', icon: Package, count: packages.length },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench, count: maintenancePlans.length },
            { id: 'faqs', label: 'FAQs', icon: HelpCircle, count: faqs.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType)
                setSearchTerm('')
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <div className="text-sm text-slate-400">
              Drag items to reorder
            </div>
          </div>

          <button
            onClick={() => {
              setShowForm(true)
              setEditingItem(null)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New {activeTab === 'packages' ? 'Package' : activeTab === 'maintenance' ? 'Plan' : 'FAQ'}
          </button>
        </div>

        {/* Content */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {/* Packages Tab */}
          {activeTab === 'packages' && (
            <div className="space-y-4">
              <SortableContext
                items={filteredPackages.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredPackages.map(pkg => (
                  <SortableItem key={pkg.id} id={pkg.id}>
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{pkg.name}</h3>
                            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                              #{pkg.order}
                            </span>
                            {pkg.published ? (
                              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                Published
                              </span>
                            ) : (
                              <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">
                                Draft
                              </span>
                            )}
                            {pkg.badge && pkg.badge !== '' && (
                              <span className={`text-xs px-2 py-1 rounded font-semibold ${
                                pkg.badge === 'best-seller' ? 'bg-orange-600 text-white' :
                                pkg.badge === 'recommended' ? 'bg-green-600 text-white' :
                                pkg.badge === 'popular' ? 'bg-purple-600 text-white' :
                                pkg.badge === 'new' ? 'bg-blue-600 text-white' :
                                'bg-slate-600 text-white'
                              }`}>
                                {pkg.badge === 'best-seller' ? 'BEST SELLER' :
                                 pkg.badge === 'recommended' ? 'RECOMMENDED' :
                                 pkg.badge === 'popular' ? 'POPULAR' :
                                 pkg.badge === 'new' ? 'NEW' :
                                 pkg.badge.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-cyan-400 text-sm mb-2">{pkg.tagline}</p>
                          <p className="text-slate-400 text-sm mb-2">{pkg.bestFor}</p>
                          <div className="text-xl font-bold text-white mb-2">
                            {settings.currencySymbol}{pkg.priceMin.toLocaleString()} - {settings.currencySymbol}{pkg.priceMax.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500">
                            {pkg.includes.length} includes • {pkg.addOns.length} add-ons • {pkg.delivery}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePublish('package', pkg)}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            title={pkg.published ? 'Unpublish' : 'Publish'}
                          >
                            {pkg.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEditPackage(pkg)}
                            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('package', pkg.id, pkg.name)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>

              {filteredPackages.length === 0 && (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {searchTerm ? 'No packages match your search.' : 'No packages yet. Create your first package!'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Maintenance Plans Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <SortableContext
                items={filteredMaintenancePlans.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredMaintenancePlans.map(plan => (
                  <SortableItem key={plan.id} id={plan.id}>
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                              #{plan.order}
                            </span>
                            {plan.published ? (
                              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                Published
                              </span>
                            ) : (
                              <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">
                                Draft
                              </span>
                            )}
                          </div>
                          <div className="text-lg font-bold text-white mb-2">
                            {settings.currencySymbol}{plan.price}/month
                          </div>
                          <div className="text-xs text-slate-500">
                            {plan.includes.length} features included
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePublish('maintenance', plan)}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            title={plan.published ? 'Unpublish' : 'Publish'}
                          >
                            {plan.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEditMaintenance(plan)}
                            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('maintenance', plan.id, plan.name)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>

              {filteredMaintenancePlans.length === 0 && (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {searchTerm ? 'No maintenance plans match your search.' : 'No maintenance plans yet. Create your first plan!'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* FAQs Tab */}
          {activeTab === 'faqs' && (
            <div className="space-y-4">
              <SortableContext
                items={filteredFaqs.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredFaqs.map(faq => (
                  <SortableItem key={faq.id} id={faq.id}>
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                              #{faq.order}
                            </span>
                            {faq.published ? (
                              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                                Published
                              </span>
                            ) : (
                              <span className="text-xs bg-slate-600 text-slate-300 px-2 py-1 rounded">
                                Draft
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2">{faq.question}</h3>
                          <p className="text-slate-400 text-sm line-clamp-2">{faq.answer}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePublish('faq', faq)}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                            title={faq.published ? 'Unpublish' : 'Publish'}
                          >
                            {faq.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleEditFAQ(faq)}
                            className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete('faq', faq.id, faq.question)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </SortableItem>
                ))}
              </SortableContext>

              {filteredFaqs.length === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">
                    {searchTerm ? 'No FAQs match your search.' : 'No FAQs yet. Create your first FAQ!'}
                  </p>
                </div>
              )}
            </div>
          )}
        </DndContext>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingItem ? 'Edit' : 'Create'} {
                    activeTab === 'packages' ? 'Package' :
                    activeTab === 'maintenance' ? 'Maintenance Plan' : 'FAQ'
                  }
                </h3>
                <button
                  onClick={resetForms}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Package Form */}
              {activeTab === 'packages' && (
                <form onSubmit={handleSubmitPackage} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Package Name *
                      </label>
                      <input
                        type="text"
                        value={packageForm.name}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                          validationErrors.name ? 'border-red-500' : 'border-slate-600'
                        }`}
                        required
                      />
                      {validationErrors.name && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Slug *
                      </label>
                      <input
                        type="text"
                        value={packageForm.slug}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, slug: e.target.value }))}
                        className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                          validationErrors.slug ? 'border-red-500' : 'border-slate-600'
                        }`}
                        required
                      />
                      {validationErrors.slug && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.slug}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tagline *
                    </label>
                    <input
                      type="text"
                      value={packageForm.tagline}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, tagline: e.target.value }))}
                      className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                        validationErrors.tagline ? 'border-red-500' : 'border-slate-600'
                      }`}
                      required
                    />
                    {validationErrors.tagline && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.tagline}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Best For *
                    </label>
                    <input
                      type="text"
                      value={packageForm.bestFor}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, bestFor: e.target.value }))}
                      className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                        validationErrors.bestFor ? 'border-red-500' : 'border-slate-600'
                      }`}
                      placeholder="e.g., Small businesses, startups, enterprise..."
                      required
                    />
                    {validationErrors.bestFor && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.bestFor}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Price Min *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={packageForm.priceMin}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, priceMin: parseInt(e.target.value) || 0 }))}
                        className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                          validationErrors.priceMin ? 'border-red-500' : 'border-slate-600'
                        }`}
                        required
                      />
                      {validationErrors.priceMin && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.priceMin}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Price Max *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={packageForm.priceMax}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, priceMax: parseInt(e.target.value) || 0 }))}
                        className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                          validationErrors.priceMax ? 'border-red-500' : 'border-slate-600'
                        }`}
                        required
                      />
                      {validationErrors.priceMax && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.priceMax}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Currency *
                      </label>
                      <select
                        value={packageForm.priceUnit}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, priceUnit: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                        required
                      >
                        <option value="NIS">NIS (₪)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      What's Included *
                    </label>
                    <div className="space-y-2">
                      {packageForm.includes.map((include, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={include}
                            onChange={(e) => {
                              const newIncludes = [...packageForm.includes]
                              newIncludes[index] = e.target.value
                              setPackageForm(prev => ({ ...prev, includes: newIncludes }))
                            }}
                            className="flex-1 px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                            placeholder="What's included in this package..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newIncludes = packageForm.includes.filter((_, i) => i !== index)
                              setPackageForm(prev => ({ ...prev, includes: newIncludes }))
                            }}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            disabled={packageForm.includes.length <= 1}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPackageForm(prev => ({ ...prev, includes: [...prev.includes, ''] }))}
                        className="flex items-center gap-2 px-3 py-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Include
                      </button>
                      {validationErrors.includes && (
                        <p className="text-red-400 text-xs">{validationErrors.includes}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Add-ons (Optional)
                    </label>
                    <div className="space-y-2">
                      {packageForm.addOns.map((addOn, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={addOn.name}
                            onChange={(e) => {
                              const newAddOns = [...packageForm.addOns]
                              newAddOns[index].name = e.target.value
                              setPackageForm(prev => ({ ...prev, addOns: newAddOns }))
                            }}
                            className="flex-1 px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                            placeholder="Add-on name..."
                          />
                          <input
                            type="text"
                            value={addOn.priceNote}
                            onChange={(e) => {
                              const newAddOns = [...packageForm.addOns]
                              newAddOns[index].priceNote = e.target.value
                              setPackageForm(prev => ({ ...prev, addOns: newAddOns }))
                            }}
                            className="w-32 px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                            placeholder="+500 NIS"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newAddOns = packageForm.addOns.filter((_, i) => i !== index)
                              setPackageForm(prev => ({ ...prev, addOns: newAddOns }))
                            }}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPackageForm(prev => ({ ...prev, addOns: [...prev.addOns, { name: '', priceNote: '' }] }))}
                        className="flex items-center gap-2 px-3 py-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Add-on
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Delivery Timeline *
                      </label>
                      <input
                        type="text"
                        value={packageForm.delivery}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, delivery: e.target.value }))}
                        className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                          validationErrors.delivery ? 'border-red-500' : 'border-slate-600'
                        }`}
                        placeholder="e.g., 3-5 days, 2-4 weeks..."
                        required
                      />
                      {validationErrors.delivery && (
                        <p className="text-red-400 text-xs mt-1">{validationErrors.delivery}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Rounds of Revisions
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={packageForm.roundsOfRevisions || ''}
                        onChange={(e) => setPackageForm(prev => ({ 
                          ...prev, 
                          roundsOfRevisions: e.target.value ? parseInt(e.target.value) : null 
                        }))}
                        className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                        placeholder="Leave empty for unlimited"
                      />
                    </div>
                  </div>

                  {/* Badge Selector */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Badge (optional)
                    </label>
                    <select
                      value={packageForm.badge}
                      onChange={(e) => setPackageForm(prev => ({ ...prev, badge: e.target.value as any }))}
                      className="w-full px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option value="">No Badge</option>
                      <option value="best-seller">Best Seller</option>
                      <option value="recommended">Recommended</option>
                      <option value="popular">Popular</option>
                      <option value="new">New</option>
                    </select>
                    <p className="text-slate-400 text-xs mt-1">Add a badge to highlight this package</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="published"
                        checked={packageForm.published}
                        onChange={(e) => setPackageForm(prev => ({ ...prev, published: e.target.checked }))}
                        className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-600 rounded focus:ring-cyan-500"
                      />
                      <label htmlFor="published" className="text-sm font-medium text-slate-300">
                        Published (visible on public page)
                      </label>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={resetForms}
                        className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'} Package
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Maintenance Plan Form */}
              {activeTab === 'maintenance' && (
                <form onSubmit={handleSubmitMaintenance} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Plan Name *
                    </label>
                    <input
                      type="text"
                      value={maintenanceForm.name}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                        validationErrors.name ? 'border-red-500' : 'border-slate-600'
                      }`}
                      placeholder="e.g., IGANI Care Basic"
                      required
                    />
                    {validationErrors.name && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Price Note *
                    </label>
                    <input
                      type="text"
                      value={maintenanceForm.priceNote}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, priceNote: e.target.value }))}
                      className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                        validationErrors.priceNote ? 'border-red-500' : 'border-slate-600'
                      }`}
                      placeholder="e.g., ₪350/month"
                      required
                    />
                    {validationErrors.priceNote && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.priceNote}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      What's Included *
                    </label>
                    <div className="space-y-2">
                      {maintenanceForm.includes.map((include, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={include}
                            onChange={(e) => {
                              const newIncludes = [...maintenanceForm.includes]
                              newIncludes[index] = e.target.value
                              setMaintenanceForm(prev => ({ ...prev, includes: newIncludes }))
                            }}
                            className="flex-1 px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                            placeholder="What's included in this maintenance plan..."
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newIncludes = maintenanceForm.includes.filter((_, i) => i !== index)
                              setMaintenanceForm(prev => ({ ...prev, includes: newIncludes }))
                            }}
                            className="p-2 text-red-400 hover:text-red-300 transition-colors"
                            disabled={maintenanceForm.includes.length <= 1}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setMaintenanceForm(prev => ({ ...prev, includes: [...prev.includes, ''] }))}
                        className="flex items-center gap-2 px-3 py-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Add Include
                      </button>
                      {validationErrors.includes && (
                        <p className="text-red-400 text-xs">{validationErrors.includes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="maintenancePublished"
                        checked={maintenanceForm.published}
                        onChange={(e) => setMaintenanceForm(prev => ({ ...prev, published: e.target.checked }))}
                        className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-600 rounded focus:ring-cyan-500"
                      />
                      <label htmlFor="maintenancePublished" className="text-sm font-medium text-slate-300">
                        Published (visible on public page)
                      </label>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={resetForms}
                        className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'} Plan
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* FAQ Form */}
              {activeTab === 'faqs' && (
                <form onSubmit={handleSubmitFAQ} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Question *
                    </label>
                    <input
                      type="text"
                      value={faqForm.question}
                      onChange={(e) => setFaqForm(prev => ({ ...prev, question: e.target.value }))}
                      className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white ${
                        validationErrors.question ? 'border-red-500' : 'border-slate-600'
                      }`}
                      placeholder="What question do customers frequently ask?"
                      required
                    />
                    {validationErrors.question && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.question}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Answer *
                    </label>
                    <textarea
                      value={faqForm.answer}
                      onChange={(e) => setFaqForm(prev => ({ ...prev, answer: e.target.value }))}
                      rows={4}
                      className={`w-full px-3 py-2 bg-slate-900/60 border rounded-lg focus:ring-2 focus:ring-cyan-500 text-white resize-none ${
                        validationErrors.answer ? 'border-red-500' : 'border-slate-600'
                      }`}
                      placeholder="Provide a clear, helpful answer..."
                      required
                    />
                    {validationErrors.answer && (
                      <p className="text-red-400 text-xs mt-1">{validationErrors.answer}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="faqPublished"
                        checked={faqForm.published}
                        onChange={(e) => setFaqForm(prev => ({ ...prev, published: e.target.checked }))}
                        className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-600 rounded focus:ring-cyan-500"
                      />
                      <label htmlFor="faqPublished" className="text-sm font-medium text-slate-300">
                        Published (visible on public page)
                      </label>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={resetForms}
                        className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : editingItem ? 'Update' : 'Create'} FAQ
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}