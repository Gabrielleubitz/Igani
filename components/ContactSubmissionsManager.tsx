'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ContactSubmission } from '@/types'
import { updateContactSubmissionStatus, assignSubmissionToDeveloper } from '@/lib/firestore'
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
  BarChart3
} from 'lucide-react'

interface ContactSubmissionsManagerProps {
  contacts: ContactSubmission[]
  onUpdate: () => void
}

export function ContactSubmissionsManager({ contacts, onUpdate }: ContactSubmissionsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [assignedTo, setAssignedTo] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<ContactSubmission['status']>('pending')
  const [cancellationReason, setCancellationReason] = useState('')
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<{ id: string, status: ContactSubmission['status'] } | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const statusConfig = {
    'pending': { icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Pending' },
    'in-progress': { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'In Progress' },
    'completed': { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', label: 'Completed' },
    'cancelled': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Cancelled' }
  }

  const handleStatusChange = async (id: string, status: ContactSubmission['status']) => {
    if (status === 'cancelled') {
      setPendingStatusChange({ id, status })
      setShowCancellationModal(true)
      return
    }

    try {
      await updateContactSubmissionStatus(id, status)
      await onUpdate()
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    }
  }

  const handleCancellationSubmit = async () => {
    if (!pendingStatusChange || !cancellationReason.trim()) {
      alert('Please provide a cancellation reason')
      return
    }

    try {
      await updateContactSubmissionStatus(pendingStatusChange.id, 'cancelled', cancellationReason)
      await onUpdate()
      setShowCancellationModal(false)
      setCancellationReason('')
      setPendingStatusChange(null)
    } catch (error) {
      console.error('Error cancelling submission:', error)
      alert('Failed to cancel submission')
    }
  }

  const handleAssignment = async (id: string) => {
    if (!assignedTo.trim()) {
      alert('Please enter a developer name')
      return
    }

    try {
      await assignSubmissionToDeveloper(id, assignedTo)
      await onUpdate()
      setEditingId(null)
      setAssignedTo('')
    } catch (error) {
      console.error('Error assigning developer:', error)
      alert('Failed to assign developer')
    }
  }

  // Analytics calculations
  const analytics = {
    total: contacts.length,
    pending: contacts.filter(c => c.status === 'pending').length,
    inProgress: contacts.filter(c => c.status === 'in-progress').length,
    completed: contacts.filter(c => c.status === 'completed').length,
    cancelled: contacts.filter(c => c.status === 'cancelled').length,
    completionRate: contacts.length > 0
      ? Math.round((contacts.filter(c => c.status === 'completed').length / contacts.length) * 100)
      : 0,
    cancellationReasons: contacts
      .filter(c => c.status === 'cancelled' && c.cancellationReason)
      .reduce((acc, c) => {
        const reason = c.cancellationReason!
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      }, {} as Record<string, number>)
  }

  return (
    <div className="space-y-6">
      {/* Analytics Toggle */}
      <button
        onClick={() => setShowAnalytics(!showAnalytics)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all duration-300"
      >
        <BarChart3 className="w-5 h-5" />
        {showAnalytics ? 'Hide' : 'Show'} Analytics
      </button>

      {/* Analytics Dashboard */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-800/60 border border-cyan-500/30 rounded-2xl p-6 space-y-6"
          >
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-cyan-400" />
              Project Analytics
            </h3>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                <div className="text-slate-400 text-sm mb-1">Total</div>
                <div className="text-2xl font-bold text-white">{analytics.total}</div>
              </div>
              <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/30">
                <div className="text-yellow-400 text-sm mb-1">Pending</div>
                <div className="text-2xl font-bold text-yellow-400">{analytics.pending}</div>
              </div>
              <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/30">
                <div className="text-blue-400 text-sm mb-1">In Progress</div>
                <div className="text-2xl font-bold text-blue-400">{analytics.inProgress}</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/30">
                <div className="text-green-400 text-sm mb-1 flex items-center gap-1">
                  Completed <TrendingUp className="w-3 h-3" />
                </div>
                <div className="text-2xl font-bold text-green-400">{analytics.completed}</div>
              </div>
              <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/30">
                <div className="text-red-400 text-sm mb-1 flex items-center gap-1">
                  Cancelled <TrendingDown className="w-3 h-3" />
                </div>
                <div className="text-2xl font-bold text-red-400">{analytics.cancelled}</div>
              </div>
            </div>

            {/* Completion Rate */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-sm font-semibold">Completion Rate</span>
                <span className="text-2xl font-bold text-cyan-400">{analytics.completionRate}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${analytics.completionRate}%` }}
                ></div>
              </div>
            </div>

            {/* Cancellation Reasons */}
            {Object.keys(analytics.cancellationReasons).length > 0 && (
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/50">
                <h4 className="text-white font-semibold mb-3">Top Cancellation Reasons</h4>
                <div className="space-y-2">
                  {Object.entries(analytics.cancellationReasons)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([reason, count]) => (
                      <div key={reason} className="flex justify-between items-center">
                        <span className="text-slate-300 text-sm">{reason}</span>
                        <span className="text-red-400 font-bold">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submissions List */}
      <div className="space-y-4">
        {contacts.length === 0 ? (
          <div className="text-center py-16 bg-slate-800/60 rounded-2xl border border-slate-700/50">
            <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No contact submissions yet</p>
          </div>
        ) : (
          contacts.map((contact) => {
            const StatusIcon = statusConfig[contact.status].icon
            return (
              <motion.div
                key={contact.id}
                layout
                className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/30 transition-all duration-300"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      {contact.firstName} {contact.lastName}
                      {contact.assignedTo && (
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full border border-cyan-500/30">
                          Assigned to: {contact.assignedTo}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {contact.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(contact.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusConfig[contact.status].bg} border ${statusConfig[contact.status].border}`}>
                    <StatusIcon className={`w-4 h-4 ${statusConfig[contact.status].color}`} />
                    <span className={`text-sm font-semibold ${statusConfig[contact.status].color}`}>
                      {statusConfig[contact.status].label}
                    </span>
                  </div>
                </div>

                {/* Project Type */}
                <div className="mb-3">
                  <span className="flex items-center gap-2 text-sm text-slate-400">
                    <Briefcase className="w-4 h-4" />
                    <span className="font-semibold">Project Type:</span> {contact.projectType}
                  </span>
                </div>

                {/* Message */}
                <p className="text-slate-300 text-sm mb-4 bg-slate-900/40 p-3 rounded-lg">
                  {contact.message}
                </p>

                {/* Cancellation Reason */}
                {contact.status === 'cancelled' && contact.cancellationReason && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">
                      <strong>Cancellation Reason:</strong> {contact.cancellationReason}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-700/50">
                  {/* Assign Developer */}
                  <div className="flex-1 min-w-[200px]">
                    {editingId === contact.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={assignedTo}
                          onChange={(e) => setAssignedTo(e.target.value)}
                          placeholder="Developer name"
                          className="flex-1 px-3 py-2 bg-slate-900/60 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                        <button
                          onClick={() => handleAssignment(contact.id)}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setAssignedTo('')
                          }}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(contact.id)
                          setAssignedTo(contact.assignedTo || '')
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition-colors w-full"
                      >
                        <User className="w-4 h-4" />
                        {contact.assignedTo ? 'Reassign' : 'Assign Developer'}
                      </button>
                    )}
                  </div>

                  {/* Status Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStatusChange(contact.id, 'pending')}
                      disabled={contact.status === 'pending'}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        contact.status === 'pending'
                          ? 'bg-yellow-500/20 text-yellow-400 cursor-not-allowed'
                          : 'bg-slate-700 text-slate-300 hover:bg-yellow-500/20 hover:text-yellow-400'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      onClick={() => handleStatusChange(contact.id, 'in-progress')}
                      disabled={contact.status === 'in-progress'}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        contact.status === 'in-progress'
                          ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed'
                          : 'bg-slate-700 text-slate-300 hover:bg-blue-500/20 hover:text-blue-400'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => handleStatusChange(contact.id, 'completed')}
                      disabled={contact.status === 'completed'}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        contact.status === 'completed'
                          ? 'bg-green-500/20 text-green-400 cursor-not-allowed'
                          : 'bg-slate-700 text-slate-300 hover:bg-green-500/20 hover:text-green-400'
                      }`}
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleStatusChange(contact.id, 'cancelled')}
                      disabled={contact.status === 'cancelled'}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        contact.status === 'cancelled'
                          ? 'bg-red-500/20 text-red-400 cursor-not-allowed'
                          : 'bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {showCancellationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCancellationModal(false)
              setCancellationReason('')
              setPendingStatusChange(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-400" />
                Cancellation Reason Required
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Please provide a reason for cancelling this project. This helps us track why projects are not moving forward.
              </p>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g., Budget constraints, Client unresponsive, Changed requirements..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white placeholder-slate-500 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleCancellationSubmit}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Confirm Cancellation
                </button>
                <button
                  onClick={() => {
                    setShowCancellationModal(false)
                    setCancellationReason('')
                    setPendingStatusChange(null)
                  }}
                  className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
