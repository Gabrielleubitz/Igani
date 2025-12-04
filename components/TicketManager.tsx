'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ContactSubmission, Package } from '@/types'
import {
  updateContactSubmissionStatus,
  assignSubmissionToDeveloper,
  updateContactSubmission,
  getPackages,
  saveContactSubmission,
  deleteContactSubmission
} from '@/lib/firestore'
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Mail,
  Briefcase,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Package as PackageIcon,
  DollarSign,
  Edit,
  Save,
  X,
  Plus,
  FileText,
  Flag,
  CalendarDays,
  Wallet,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react'

interface TicketManagerProps {
  contacts: ContactSubmission[]
  onUpdate: () => void
}

export function TicketManager({ contacts, onUpdate }: TicketManagerProps) {
  const [packages, setPackages] = useState<Package[]>([])
  const [editingTicket, setEditingTicket] = useState<ContactSubmission | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<ContactSubmission['status']>('pending')
  const [cancellationReason, setCancellationReason] = useState('')
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string, status: ContactSubmission['status'] } | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<ContactSubmission['status'] | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status' | 'priority'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showTicketDetails, setShowTicketDetails] = useState<string | null>(null)
  const [quickEditingTicket, setQuickEditingTicket] = useState<string | null>(null)
  const [quickEditData, setQuickEditData] = useState<{ paidAt?: string; buildingFee?: number }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isQuickSaving, setIsQuickSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [quickEditError, setQuickEditError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInquiry, setNewInquiry] = useState({
    firstName: '',
    lastName: '',
    email: '',
    projectType: 'Landing Page',
    message: '',
    priority: 'medium' as ContactSubmission['priority'],
    source: 'manual' as 'website' | 'manual' | 'referral' | 'other'
  })

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      const packagesData = await getPackages()
      setPackages(packagesData.filter(p => p.published))
    } catch (error) {
      console.error('Error loading packages:', error)
    }
  }

  const statusConfig = {
    'pending': { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Pending' },
    'in-progress': { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'In Progress' },
    'completed': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Completed' },
    'cancelled': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Cancelled' }
  }

  const priorityConfig = {
    'low': { color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Low' },
    'medium': { color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Medium' },
    'high': { color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'High' },
    'urgent': { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Urgent' }
  }

  const handleStatusChange = async (id: string, status: ContactSubmission['status']) => {
    if (status === 'cancelled') {
      setPendingStatusChange({ id, status })
      setShowCancellationModal(true)
      return
    }

    try {
      await updateContactSubmissionStatus(id, status, undefined)
      onUpdate()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleCancelConfirm = async () => {
    if (pendingStatusChange) {
      try {
        await updateContactSubmissionStatus(
          pendingStatusChange.id, 
          pendingStatusChange.status, 
          cancellationReason
        )
        onUpdate()
        setShowCancellationModal(false)
        setCancellationReason('')
        setPendingStatusChange(null)
      } catch (error) {
        console.error('Error cancelling submission:', error)
      }
    }
  }

  const handleEditTicket = (ticket: ContactSubmission) => {
    console.log('Opening edit modal with ticket:', ticket)
    console.log('paidAt value:', ticket.paidAt)
    setEditingTicket({ ...ticket })
    setSaveError(null)
  }

  const handleSaveTicket = async () => {
    if (!editingTicket) return

    setIsSaving(true)
    setSaveError(null)

    try {
      // Auto-set completedAt if status is being set to completed
      const ticketToSave = { ...editingTicket }
      if (ticketToSave.status === 'completed' && !ticketToSave.completedAt) {
        ticketToSave.completedAt = new Date().toISOString()
      }

      await updateContactSubmission(ticketToSave)
      setEditingTicket(null)
      await onUpdate() // Make sure we wait for the update

      // Show success message and scroll to top
      setSaveSuccess('Inquiry updated successfully!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setSaveSuccess(null), 5000)
    } catch (error) {
      console.error('Error updating ticket:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save ticket')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateInquiry = async () => {
    if (!newInquiry.firstName || !newInquiry.lastName || !newInquiry.email || !newInquiry.message) {
      setSaveError('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      await saveContactSubmission(newInquiry)
      setShowCreateModal(false)
      setNewInquiry({
        firstName: '',
        lastName: '',
        email: '',
        projectType: 'Landing Page',
        message: '',
        priority: 'medium',
        source: 'manual'
      })
      await onUpdate()

      // Show success message and scroll to top
      setSaveSuccess('Inquiry created successfully!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setSaveSuccess(null), 5000)
    } catch (error) {
      console.error('Error creating inquiry:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to create inquiry')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTicket = async (id: string, clientName: string) => {
    if (!confirm(`Are you sure you want to delete the inquiry from ${clientName}? This action cannot be undone.`)) return

    try {
      await deleteContactSubmission(id)
      await onUpdate()
    } catch (error) {
      console.error('Error deleting inquiry:', error)
      alert('Failed to delete inquiry. Please try again.')
    }
  }

  const handleQuickEdit = (contact: ContactSubmission) => {
    setQuickEditingTicket(contact.id)
    setQuickEditData({
      paidAt: contact.paidAt ? contact.paidAt.substring(0, 10) : '',
      buildingFee: contact.buildingFee
    })
  }

  const handleSaveQuickEdit = async (contact: ContactSubmission) => {
    console.log('=== QUICK EDIT SAVE START ===')
    console.log('1. Current contact:', contact)
    console.log('2. Quick edit data:', quickEditData)
    console.log('3. paidAt input value:', quickEditData.paidAt)
    console.log('4. buildingFee input value:', quickEditData.buildingFee)

    setIsQuickSaving(true)
    setQuickEditError(null)

    try {
      // Process the paidAt date
      let processedPaidAt: string | undefined = undefined
      if (quickEditData.paidAt && quickEditData.paidAt.trim() !== '') {
        processedPaidAt = new Date(quickEditData.paidAt).toISOString()
        console.log('5. Processed paidAt (ISO):', processedPaidAt)
      } else {
        console.log('5. paidAt is empty, will not update')
      }

      // Process building fee
      const processedBuildingFee = quickEditData.buildingFee || undefined
      console.log('6. Processed buildingFee:', processedBuildingFee)

      const updatedContact = {
        ...contact,
        paidAt: processedPaidAt,
        buildingFee: processedBuildingFee
      }

      console.log('7. Final updated contact object:', updatedContact)
      console.log('8. Calling updateContactSubmission...')

      await updateContactSubmission(updatedContact)
      console.log('9. updateContactSubmission completed successfully')

      // Close quick edit and refresh data
      setQuickEditingTicket(null)
      setQuickEditData({})

      console.log('10. Calling onUpdate to refresh data...')
      await onUpdate()
      console.log('11. onUpdate completed')

      // Show success message
      setSaveSuccess('Payment info updated successfully!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setSaveSuccess(null), 5000)

      console.log('=== QUICK EDIT SAVE SUCCESS ===')
    } catch (error) {
      console.error('=== QUICK EDIT SAVE ERROR ===')
      console.error('Error details:', error)
      setQuickEditError(error instanceof Error ? error.message : 'Failed to save changes')
    } finally {
      setIsQuickSaving(false)
    }
  }

  const getLinkedPackage = (packageId?: string) => {
    if (!packageId) return null
    return packages.find(p => p.id === packageId)
  }

  const filteredAndSortedContacts = contacts
    .filter(contact => {
      const matchesSearch = 
        contact.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.projectType.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = filterStatus === 'all' || contact.status === filterStatus
      
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      let aVal, bVal
      
      switch (sortBy) {
        case 'name':
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase()
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase()
          break
        case 'status':
          aVal = a.status
          bVal = b.status
          break
        case 'priority':
          const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1 }
          aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0
          bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0
          break
        default: // date
          aVal = new Date(a.submittedAt).getTime()
          bVal = new Date(b.submittedAt).getTime()
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })


  // Currency conversion rates (to ILS)
  const EXCHANGE_RATES: { [key: string]: number } = {
    '₪': 1,
    '$': 3.65,
    '€': 4.0,
    'USD': 3.65,
    'EUR': 4.0,
    'ILS': 1
  }

  const convertToILS = (amount: number, currency: string): number => {
    const rate = EXCHANGE_RATES[currency] || EXCHANGE_RATES[currency.replace(/[^A-Z]/g, '')] || 1
    return amount * rate
  }

  // Analytics calculations
  const analytics = {
    total: contacts.length,
    pending: contacts.filter(c => c.status === 'pending').length,
    inProgress: contacts.filter(c => c.status === 'in-progress').length,
    completed: contacts.filter(c => c.status === 'completed').length,
    cancelled: contacts.filter(c => c.status === 'cancelled').length,
    withPackages: contacts.filter(c => c.linkedPackageId).length,
    // Exclude cancelled projects from revenue calculation
    totalQuotedValue: contacts
      .filter(c => c.status !== 'cancelled')
      .reduce((sum, c) => sum + convertToILS(c.quotedPrice || 0, c.currency || '₪'), 0),
    avgResponseTime: '2.3 days', // This would need real calculation
    urgentTickets: contacts.filter(c => c.priority === 'urgent').length
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-600/20 border border-green-500/50 text-green-400 p-4 rounded-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">{saveSuccess}</span>
            </div>
            <button
              onClick={() => setSaveSuccess(null)}
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Search and Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Customer Inquiries</h2>
          <p className="text-slate-400 text-sm">Manage customer inquiries, link to packages, and track project details</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-cyan-500/20 font-semibold"
          >
            <Plus className="w-4 h-4" />
            Create Inquiry
          </button>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              showAnalytics
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6 mb-6"
          >
            <h3 className="text-lg font-bold text-white mb-4">Ticket Analytics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-2xl font-bold text-white mb-1">{analytics.total}</div>
                <div className="text-slate-400 text-xs leading-tight">Total Tickets</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{analytics.pending}</div>
                <div className="text-slate-400 text-xs leading-tight">Pending</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400 mb-1">{analytics.inProgress}</div>
                <div className="text-slate-400 text-xs leading-tight">In Progress</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400 mb-1">{analytics.completed}</div>
                <div className="text-slate-400 text-xs leading-tight">Completed</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-2xl font-bold text-cyan-400 mb-1">{analytics.withPackages}</div>
                <div className="text-slate-400 text-xs leading-tight">With Packages</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-xl font-bold text-green-400 mb-1">₪{analytics.totalQuotedValue.toFixed(0)}</div>
                <div className="text-slate-400 text-xs leading-tight">Revenue (ILS)</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-400 mb-1">{analytics.urgentTickets}</div>
                <div className="text-slate-400 text-xs leading-tight">Urgent</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-xl font-bold text-purple-400 mb-1">{analytics.avgResponseTime}</div>
                <div className="text-slate-400 text-xs leading-tight">Avg Response</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filter Controls */}
      <div className="flex flex-col lg:flex-row gap-4 bg-slate-800/60 rounded-xl border border-slate-700/50 p-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or project type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
            <option value="priority">Sort by Priority</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        
        {filteredAndSortedContacts.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/60 rounded-2xl border border-slate-700/50">
            <MessageSquare className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">
              {searchTerm || filterStatus !== 'all' ? 'No tickets match your filters' : 'No tickets yet'}
            </p>
          </div>
        ) : (
          filteredAndSortedContacts.map((contact) => {
            const StatusIcon = statusConfig[contact.status].icon
            const linkedPackage = getLinkedPackage(contact.linkedPackageId)
            const isExpanded = showTicketDetails === contact.id
            
            return (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl hover:border-cyan-500/50 transition-all duration-300"
              >
                {/* Ticket Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusConfig[contact.status].bg} ${statusConfig[contact.status].border} border`}>
                          <StatusIcon className={`w-4 h-4 ${statusConfig[contact.status].color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {contact.firstName} {contact.lastName}
                          </h3>
                          <p className="text-slate-400 text-sm">{contact.email}</p>
                        </div>
                        {contact.priority && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig[contact.priority].bg} ${priorityConfig[contact.priority].color} border border-current/30`}>
                            <Flag className="w-3 h-3 inline mr-1" />
                            {priorityConfig[contact.priority].label}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Briefcase className="w-4 h-4 text-slate-500" />
                          <span className="text-sm">{contact.projectType}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Calendar className="w-4 h-4 text-slate-500" />
                          <span className="text-sm">{new Date(contact.submittedAt).toLocaleDateString('en-GB')}</span>
                        </div>
                        {linkedPackage && (
                          <div className="flex items-center gap-2 text-cyan-400">
                            <PackageIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">{linkedPackage.name}</span>
                          </div>
                        )}
                      </div>

                      {contact.quotedPrice && (
                        <div className="flex items-center gap-4 mb-4 p-3 bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-lg border border-green-500/20">
                          <div className="flex items-center gap-2 text-green-400">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold">
                              {contact.currency || '₪'}{contact.quotedPrice}
                              {contact.buildingFee && (
                                <span className="text-cyan-400"> + {contact.currency || '₪'}{contact.buildingFee}</span>
                              )}
                            </span>
                          </div>
                          {contact.currency && contact.currency !== '₪' && (
                            <div className="flex items-center gap-2 text-cyan-400">
                              <span className="text-xs">
                                ≈ ₪{convertToILS((contact.quotedPrice || 0) + (contact.buildingFee || 0), contact.currency).toFixed(2)}
                              </span>
                            </div>
                          )}
                          {contact.clientBudget && (
                            <div className="flex items-center gap-2 text-slate-300">
                              <Wallet className="w-4 h-4" />
                              <span className="text-sm">Budget: {contact.clientBudget}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-4 h-4 text-slate-500" />
                        <p className="text-slate-300 text-sm line-clamp-2">{contact.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setShowTicketDetails(isExpanded ? null : contact.id)}
                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-all"
                        title={isExpanded ? 'Hide details' : 'Show details'}
                      >
                        {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleQuickEdit(contact)}
                        className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-700/50 rounded-lg transition-all"
                        title="Quick edit payment info"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditTicket(contact)}
                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-all"
                        title="Edit ticket"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTicket(contact.id, `${contact.firstName} ${contact.lastName}`)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                        title="Delete inquiry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Status and Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[contact.status].bg} ${statusConfig[contact.status].color} border border-current/30`}>
                        {statusConfig[contact.status].label}
                      </span>
                      {contact.assignedTo && (
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {contact.assignedTo}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {contact.followUpDate && new Date(contact.followUpDate) <= new Date() && (
                        <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-full border border-orange-500/30">
                          Follow-up Due
                        </span>
                      )}

                      <select
                        value={contact.status}
                        onChange={(e) => handleStatusChange(contact.id, e.target.value as ContactSubmission['status'])}
                        className="px-3 py-1 bg-slate-700 text-white text-sm rounded-lg border border-slate-600 focus:ring-2 focus:ring-cyan-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick Edit Payment Info */}
                <AnimatePresence>
                  {quickEditingTicket === contact.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-700/50 p-6 bg-slate-900/40"
                    >
                      <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        Quick Edit Payment Info
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-white font-medium mb-2">Payment Date</label>
                          <input
                            type="date"
                            value={quickEditData.paidAt || ''}
                            onChange={(e) => setQuickEditData({ ...quickEditData, paidAt: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                          />
                          <p className="text-slate-400 text-xs mt-1">
                            {quickEditData.paidAt ? 'Payment recorded' : 'No payment date - not shown in financial reports'}
                          </p>
                        </div>

                        <div>
                          <label className="block text-white font-medium mb-2">Building Fee ({contact.currency || '₪'})</label>
                          <input
                            type="number"
                            value={quickEditData.buildingFee || ''}
                            onChange={(e) => setQuickEditData({ ...quickEditData, buildingFee: parseFloat(e.target.value) || undefined })}
                            className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                            placeholder="0"
                            step="0.01"
                          />
                          <p className="text-slate-400 text-xs mt-1">Additional building/setup fee</p>
                        </div>
                      </div>

                      {quickEditError && (
                        <div className="mb-4 p-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg text-sm">
                          {quickEditError}
                        </div>
                      )}

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setQuickEditingTicket(null)
                            setQuickEditData({})
                            setQuickEditError(null)
                          }}
                          disabled={isQuickSaving}
                          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveQuickEdit(contact)}
                          disabled={isQuickSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-lg hover:from-green-700 hover:to-cyan-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                          <Save className="w-4 h-4" />
                          {isQuickSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-700/50 p-6 bg-slate-900/40"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-white font-medium mb-3">Additional Details</h4>
                          <div className="space-y-2 text-sm">
                            {contact.estimatedDelivery && (
                              <div className="flex items-center gap-2 text-slate-300">
                                <CalendarDays className="w-4 h-4 text-slate-500" />
                                <span>Delivery: {contact.estimatedDelivery}</span>
                              </div>
                            )}
                            {contact.notes && (
                              <div className="flex items-start gap-2 text-slate-300">
                                <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
                                <span>{contact.notes}</span>
                              </div>
                            )}
                            {contact.followUpDate && (
                              <div className="flex items-center gap-2 text-slate-300">
                                <Calendar className="w-4 h-4 text-slate-500" />
                                <span>Follow-up: {new Date(contact.followUpDate).toLocaleDateString('en-GB')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-white font-medium mb-3">Full Message</h4>
                          <p className="text-slate-300 text-sm leading-relaxed bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                            {contact.message}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Edit Ticket Modal */}
      <AnimatePresence>
        {editingTicket && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault()
                  handleSaveTicket()
                }
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Edit Ticket</h2>
                <button
                  onClick={() => setEditingTicket(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Priority</label>
                    <select
                      value={editingTicket.priority || 'medium'}
                      onChange={(e) => setEditingTicket({
                        ...editingTicket,
                        priority: e.target.value as ContactSubmission['priority']
                      })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Assigned To</label>
                    <input
                      type="text"
                      value={editingTicket.assignedTo || ''}
                      onChange={(e) => setEditingTicket({
                        ...editingTicket,
                        assignedTo: e.target.value
                      })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                      placeholder="Developer name"
                    />
                  </div>
                </div>

                {/* Package Linking */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Link to Package</label>
                    <select
                      value={editingTicket.linkedPackageId || ''}
                      onChange={(e) => {
                        const selectedPackage = packages.find(p => p.id === e.target.value)
                        setEditingTicket({
                          ...editingTicket,
                          linkedPackageId: e.target.value || undefined,
                          linkedPackageName: selectedPackage?.name || undefined
                        })
                      }}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option value="">No package selected</option>
                      {packages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Quoted Price</label>
                    <div className="flex gap-2">
                      <select
                        value={editingTicket.currency || '₪'}
                        onChange={(e) => setEditingTicket({
                          ...editingTicket,
                          currency: e.target.value
                        })}
                        className="px-3 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                      >
                        <option value="₪">₪</option>
                        <option value="$">$</option>
                        <option value="€">€</option>
                      </select>
                      <input
                        type="number"
                        value={editingTicket.quotedPrice || ''}
                        onChange={(e) => setEditingTicket({
                          ...editingTicket,
                          quotedPrice: parseFloat(e.target.value) || undefined
                        })}
                        className="flex-1 px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Building Fee */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-cyan-400" />
                    Building Fee
                  </label>
                  <input
                    type="number"
                    value={editingTicket.buildingFee || ''}
                    onChange={(e) => setEditingTicket({
                      ...editingTicket,
                      buildingFee: parseFloat(e.target.value) || undefined
                    })}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                    placeholder="0"
                  />
                  <p className="text-slate-400 text-xs mt-1">Separate building/setup fee (same currency as quoted price)</p>
                </div>

                {/* Timeline and Budget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Estimated Delivery</label>
                    <input
                      type="text"
                      value={editingTicket.estimatedDelivery || ''}
                      onChange={(e) => setEditingTicket({
                        ...editingTicket,
                        estimatedDelivery: e.target.value
                      })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                      placeholder="e.g., 2-3 weeks"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Client Budget</label>
                    <input
                      type="text"
                      value={editingTicket.clientBudget || ''}
                      onChange={(e) => setEditingTicket({
                        ...editingTicket,
                        clientBudget: e.target.value
                      })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                      placeholder="e.g., ₪5000-₪8000"
                    />
                  </div>
                </div>

                {/* Follow-up Date */}
                <div>
                  <label className="block text-white font-medium mb-2">Follow-up Date</label>
                  <input
                    type="date"
                    value={editingTicket.followUpDate || ''}
                    onChange={(e) => setEditingTicket({
                      ...editingTicket,
                      followUpDate: e.target.value
                    })}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                  />
                </div>

                {/* Important Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Date Created</label>
                    <input
                      type="datetime-local"
                      value={editingTicket.submittedAt ? editingTicket.submittedAt.substring(0, 16) : ''}
                      onChange={(e) => setEditingTicket({
                        ...editingTicket,
                        submittedAt: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString()
                      })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    />
                    <p className="text-slate-400 text-xs mt-1">When the inquiry was received</p>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Date Completed</label>
                    {editingTicket.completedAt ? (
                      <div className="w-full px-4 py-3 bg-green-900/20 border border-green-500/30 rounded-lg text-green-400 flex items-center justify-between">
                        <span>{new Date(editingTicket.completedAt).toLocaleDateString('en-GB')} {new Date(editingTicket.completedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          type="button"
                          onClick={() => setEditingTicket({
                            ...editingTicket,
                            completedAt: undefined
                          })}
                          className="text-red-400 hover:text-red-300"
                          title="Clear completion date"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg text-slate-500">
                        {editingTicket.status === 'completed' ? 'Will be set on save' : 'Not completed yet'}
                      </div>
                    )}
                    <p className="text-slate-400 text-xs mt-1">Auto-set when status is completed</p>
                  </div>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-white font-medium mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={editingTicket.paidAt ? editingTicket.paidAt.substring(0, 10) : ''}
                    onChange={(e) => setEditingTicket({
                      ...editingTicket,
                      paidAt: e.target.value ? new Date(e.target.value).toISOString() : undefined
                    })}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                  />
                  <p className="text-slate-400 text-xs mt-1">When payment was received (for financial reporting)</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-white font-medium mb-2">Internal Notes</label>
                  <textarea
                    value={editingTicket.notes || ''}
                    onChange={(e) => setEditingTicket({
                      ...editingTicket,
                      notes: e.target.value
                    })}
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                    placeholder="Internal notes, requirements, follow-up actions..."
                  />
                </div>

                {/* Error Message */}
                {saveError && (
                  <div className="mt-4 p-4 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg">
                    <p className="text-sm">{saveError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-4 pt-6 border-t border-slate-700/50">
                  <button
                    onClick={() => setEditingTicket(null)}
                    className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTicket}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 inline mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {showCancellationModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold text-white mb-4">Cancel Submission</h3>
              <p className="text-slate-300 mb-4">Please provide a reason for cancelling this submission:</p>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500 mb-4"
                placeholder="Reason for cancellation..."
                rows={3}
                required
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCancellationModal(false)
                    setCancellationReason('')
                    setPendingStatusChange(null)
                  }}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={!cancellationReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Cancellation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Inquiry Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault()
                  handleCreateInquiry()
                }
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Create New Customer Inquiry</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setSaveError(null)
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-slate-400 text-sm mb-6">
                Manually create an inquiry for clients acquired through other channels (phone, referral, etc.)
              </p>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">First Name *</label>
                    <input
                      type="text"
                      value={newInquiry.firstName}
                      onChange={(e) => setNewInquiry({ ...newInquiry, firstName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                      placeholder="John"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={newInquiry.lastName}
                      onChange={(e) => setNewInquiry({ ...newInquiry, lastName: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    value={newInquiry.email}
                    onChange={(e) => setNewInquiry({ ...newInquiry, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                    placeholder="john.doe@example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Project Type</label>
                    <select
                      value={newInquiry.projectType}
                      onChange={(e) => setNewInquiry({ ...newInquiry, projectType: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option>Landing Page</option>
                      <option>Small Business Website</option>
                      <option>Premium Brand Site</option>
                      <option>E-commerce Website</option>
                      <option>Custom Web App</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Priority</label>
                    <select
                      value={newInquiry.priority}
                      onChange={(e) => setNewInquiry({ ...newInquiry, priority: e.target.value as ContactSubmission['priority'] })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Source</label>
                  <select
                    value={newInquiry.source}
                    onChange={(e) => setNewInquiry({ ...newInquiry, source: e.target.value as any })}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="referral">Referral</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Project Details *</label>
                  <textarea
                    value={newInquiry.message}
                    onChange={(e) => setNewInquiry({ ...newInquiry, message: e.target.value })}
                    rows={5}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                    placeholder="Enter client's project requirements, goals, and any other relevant information..."
                    required
                  />
                </div>

                {/* Error Message */}
                {saveError && (
                  <div className="p-4 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg">
                    <p className="text-sm">{saveError}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-4 pt-6 border-t border-slate-700/50">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setSaveError(null)
                    }}
                    className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateInquiry}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    {isSaving ? 'Creating...' : 'Create Inquiry'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}