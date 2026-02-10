'use client'

import { useState } from 'react'
import { SupportInquiry } from '@/types'
import { updateSupportInquiryStatus, updateSupportInquiry } from '@/lib/firestore'
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Filter,
  Save
} from 'lucide-react'

interface SupportInquiriesManagerProps {
  inquiries: SupportInquiry[]
  onUpdate: () => void
}

const STATUS_CONFIG: Record<SupportInquiry['status'], { icon: typeof AlertCircle; label: string; color: string }> = {
  new: { icon: AlertCircle, label: 'New', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  in_progress: { icon: Clock, label: 'In progress', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  resolved: { icon: CheckCircle, label: 'Resolved', color: 'text-green-400 bg-green-500/10 border-green-500/30' }
}

export function SupportInquiriesManager({ inquiries, onUpdate }: SupportInquiriesManagerProps) {
  const [productFilter, setProductFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const filtered = inquiries.filter((i) => {
    const productKey = i.productSlug || i.productName || i.product
    if (productFilter !== 'all' && productKey !== productFilter) return false
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    return true
  })

  const products = Array.from(
    new Set(
      inquiries.map((i) => i.productSlug || i.productName || i.product).filter(Boolean)
    )
  ).sort()

  const handleStatusChange = async (id: string, status: SupportInquiry['status']) => {
    try {
      await updateSupportInquiryStatus(id, status)
      onUpdate()
    } catch (e) {
      console.error(e)
      alert('Failed to update status')
    }
  }

  const handleSaveNotes = async (id: string) => {
    setSavingNotes(true)
    try {
      await updateSupportInquiry(id, { internalNotes: notesDraft })
      onUpdate()
      setEditingNotesId(null)
      setNotesDraft('')
    } catch (e) {
      console.error(e)
      alert('Failed to save notes')
    } finally {
      setSavingNotes(false)
    }
  }

  const startEditingNotes = (inq: SupportInquiry) => {
    setEditingNotesId(inq.id)
    setNotesDraft(inq.internalNotes ?? '')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-5 h-5" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <select
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm"
        >
          <option value="all">All products</option>
          {products.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-700/50 overflow-hidden bg-slate-800/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/80">
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Product / Slug</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No support inquiries match the filters.
                  </td>
                </tr>
              ) : (
                filtered.map((inq) => {
                  const config = STATUS_CONFIG[inq.status]
                  const Icon = config.icon
                  const isExpanded = expandedId === inq.id
                  return (
                    <tr
                      key={inq.id}
                      className="border-b border-slate-700/30 hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-300 text-sm whitespace-nowrap">
                        {new Date(inq.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{inq.name}</span>
                        <br />
                        <span className="text-slate-500 text-sm">{inq.email}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm">
                        {inq.productName || inq.product}
                        {inq.productSlug && (
                          <span className="text-slate-500 ml-1">({inq.productSlug})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-sm capitalize">
                        {inq.issueType.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={inq.status}
                          onChange={(e) => handleStatusChange(inq.id, e.target.value as SupportInquiry['status'])}
                          className={`px-2 py-1 rounded text-xs font-medium border ${config.color} bg-slate-800 border-slate-600 focus:ring-1 focus:ring-cyan-500`}
                        >
                          <option value="new">New</option>
                          <option value="in_progress">In progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : inq.id)}
                          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white"
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.map((inq) => {
          if (expandedId !== inq.id) return null
          return (
            <div
              key={inq.id}
              className="border-t border-slate-700/50 bg-slate-900/80 px-4 py-4 md:px-6 space-y-3"
            >
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 mb-1">Description</p>
                  <p className="text-slate-200 whitespace-pre-wrap">{inq.description}</p>
                </div>
                <div className="space-y-2">
                  {inq.stepsToReproduce && (
                    <>
                      <p className="text-slate-500">Steps to reproduce</p>
                      <p className="text-slate-300 whitespace-pre-wrap">{inq.stepsToReproduce}</p>
                    </>
                  )}
                  {inq.pageOrFeature && (
                    <>
                      <p className="text-slate-500">Page / feature</p>
                      <p className="text-slate-300">{inq.pageOrFeature}</p>
                    </>
                  )}
                  {(inq.deviceType || inq.browser) && (
                    <p className="text-slate-400">
                      {[inq.deviceType, inq.browser].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {inq.attachmentUrl && (
                    <p>
                      <a
                        href={inq.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View attachment
                      </a>
                    </p>
                  )}
                  {inq.userAgent && (
                    <p className="text-slate-500 text-xs truncate max-w-md" title={inq.userAgent}>
                      {inq.userAgent}
                    </p>
                  )}
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className="text-slate-500 mb-1">Internal notes</p>
                    {editingNotesId === inq.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm resize-y"
                          placeholder="Add notes for the team..."
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveNotes(inq.id)}
                            disabled={savingNotes}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm rounded-lg"
                          >
                            <Save className="w-4 h-4" />
                            {savingNotes ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingNotesId(null); setNotesDraft('') }}
                            className="px-3 py-1.5 text-slate-400 hover:text-white text-sm rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-slate-300 text-sm whitespace-pre-wrap flex-1 min-w-0">
                          {inq.internalNotes || <span className="text-slate-500 italic">No notes</span>}
                        </p>
                        <button
                          type="button"
                          onClick={() => startEditingNotes(inq)}
                          className="shrink-0 px-2 py-1 text-cyan-400 hover:text-cyan-300 text-sm"
                        >
                          {inq.internalNotes ? 'Edit' : 'Add notes'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-slate-500 text-xs">
                Source: {inq.source} · ID: {inq.id}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
