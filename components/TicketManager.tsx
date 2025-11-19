'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ContactSubmission, Package } from '@/types'
import { 
  updateContactSubmissionStatus, 
  assignSubmissionToDeveloper,
  updateContactSubmission,
  getPackages 
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
  EyeOff
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
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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
    setEditingTicket({ ...ticket })
    setSaveError(null)
  }

  const handleSaveTicket = async () => {
    if (!editingTicket) return

    setIsSaving(true)
    setSaveError(null)

    try {
      await updateContactSubmission(editingTicket)
      setEditingTicket(null)
      await onUpdate() // Make sure we wait for the update
    } catch (error) {
      console.error('Error updating ticket:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save ticket')
    } finally {
      setIsSaving(false)
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


  // Analytics calculations
  const analytics = {
    total: contacts.length,
    pending: contacts.filter(c => c.status === 'pending').length,
    inProgress: contacts.filter(c => c.status === 'in-progress').length,
    completed: contacts.filter(c => c.status === 'completed').length,
    cancelled: contacts.filter(c => c.status === 'cancelled').length,
    withPackages: contacts.filter(c => c.linkedPackageId).length,
    totalQuotedValue: contacts.reduce((sum, c) => sum + (c.quotedPrice || 0), 0),
    avgResponseTime: '2.3 days', // This would need real calculation
    urgentTickets: contacts.filter(c => c.priority === 'urgent').length
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Customer Inquiries</h2>
          <p className="text-slate-400 text-sm">Manage customer inquiries, link to packages, and track project details</p>
        </div>
        
        <div className="flex items-center gap-4">
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
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">{analytics.total}</div>
                <div className="text-slate-400 text-sm">Total Tickets</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400">{analytics.pending}</div>
                <div className="text-slate-400 text-sm">Pending</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{analytics.inProgress}</div>
                <div className="text-slate-400 text-sm">In Progress</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{analytics.completed}</div>
                <div className="text-slate-400 text-sm">Completed</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-2xl font-bold text-cyan-400">{analytics.withPackages}</div>
                <div className="text-slate-400 text-sm">Linked to Package</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">₪{analytics.totalQuotedValue}</div>
                <div className="text-slate-400 text-sm">Total Quoted</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-400">{analytics.urgentTickets}</div>
                <div className="text-slate-400 text-sm">Urgent</div>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">{analytics.avgResponseTime}</div>
                <div className="text-slate-400 text-sm">Avg Response</div>
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
                          <span className="text-sm">{new Date(contact.submittedAt).toLocaleDateString()}</span>
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
                            </span>
                          </div>
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
                        onClick={() => handleEditTicket(contact)}
                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-all"
                        title="Edit ticket"
                      >
                        <Edit className="w-4 h-4" />
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
                                <span>Follow-up: {new Date(contact.followUpDate).toLocaleDateString()}</span>
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
    </div>
  )
}