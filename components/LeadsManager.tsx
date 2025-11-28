'use client'

import { useEffect, useState } from 'react'
import { Search, Mail, Phone, Calendar, MapPin, Filter, Download, Trash2, CheckCircle, XCircle, Clock, UserX } from 'lucide-react'

interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  source: 'landing_page' | 'main_site'
  sourceDetails?: {
    page?: string
    utm_source?: string
    utm_campaign?: string
    referrer?: string
  }
  submittedAt: string
  message?: string
  status?: 'new' | 'contacted' | 'converted' | 'cancelled' | 'not_interested'
  createdAt: string
}

export function LeadsManager() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'landing_page' | 'main_site'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'converted' | 'cancelled' | 'not_interested'>('all')
  const [stats, setStats] = useState({
    total: 0,
    landing_page: 0,
    main_site: 0,
    today: 0,
    thisWeek: 0,
    new: 0,
    converted: 0
  })

  useEffect(() => {
    loadLeads()
  }, [])

  useEffect(() => {
    calculateStats()
  }, [leads])

  const loadLeads = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/leads')
      if (response.ok) {
        const data = await response.json()
        setLeads(data)
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const stats = {
      total: leads.length,
      landing_page: leads.filter(lead => lead.source === 'landing_page').length,
      main_site: leads.filter(lead => lead.source === 'main_site').length,
      today: leads.filter(lead => new Date(lead.createdAt) >= today).length,
      thisWeek: leads.filter(lead => new Date(lead.createdAt) >= weekAgo).length,
      new: leads.filter(lead => (lead.status || 'new') === 'new').length,
      converted: leads.filter(lead => lead.status === 'converted').length
    }

    setStats(stats)
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchTerm === '' ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.phone && lead.phone.includes(searchTerm))

    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
    const matchesStatus = statusFilter === 'all' || (lead.status || 'new') === statusFilter

    return matchesSearch && matchesSource && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'landing_page':
        return 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
      case 'main_site':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
      default:
        return 'bg-slate-600 text-white'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'contacted':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'converted':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'not_interested':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="w-3 h-3" />
      case 'contacted':
        return <Mail className="w-3 h-3" />
      case 'converted':
        return <CheckCircle className="w-3 h-3" />
      case 'cancelled':
        return <XCircle className="w-3 h-3" />
      case 'not_interested':
        return <UserX className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, status: newStatus })
      })

      if (response.ok) {
        // Update local state
        setLeads(leads.map(lead =>
          lead.id === leadId ? { ...lead, status: newStatus as any } : lead
        ))
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
    }
  }

  const handleDelete = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) {
      return
    }

    try {
      const response = await fetch(`/api/leads?id=${leadId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Update local state
        setLeads(leads.filter(lead => lead.id !== leadId))
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
    }
  }

  const exportLeads = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Source', 'Status', 'Submitted At', 'Message'].join(','),
      ...filteredLeads.map(lead => [
        lead.name,
        lead.email,
        lead.phone || '',
        lead.source,
        lead.status || 'new',
        lead.submittedAt,
        (lead.message || '').replace(/"/g, '""')
      ].map(field => `"${field}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded mb-4"></div>
          <div className="h-4 bg-slate-700 rounded mb-2"></div>
          <div className="h-4 bg-slate-700 rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Leads Management</h2>
        <button
          onClick={exportLeads}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-6">
        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-slate-300 text-sm">Total</div>
        </div>
        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-400">{stats.new}</div>
          <div className="text-blue-300 text-sm">New</div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="text-2xl font-bold text-green-400">{stats.converted}</div>
          <div className="text-green-300 text-sm">Converted</div>
        </div>
        <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
          <div className="text-2xl font-bold text-orange-400">{stats.landing_page}</div>
          <div className="text-orange-300 text-sm">Landing</div>
        </div>
        <div className="bg-cyan-500/10 rounded-lg p-4 border border-cyan-500/20">
          <div className="text-2xl font-bold text-cyan-400">{stats.main_site}</div>
          <div className="text-cyan-300 text-sm">Main Site</div>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/20">
          <div className="text-2xl font-bold text-emerald-400">{stats.today}</div>
          <div className="text-emerald-300 text-sm">Today</div>
        </div>
        <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
          <div className="text-2xl font-bold text-purple-400">{stats.thisWeek}</div>
          <div className="text-purple-300 text-sm">This Week</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="text-slate-400 w-4 h-4" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="all">All Sources</option>
            <option value="landing_page">Landing Page</option>
            <option value="main_site">Main Site</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-400"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="converted">Converted</option>
            <option value="cancelled">Cancelled</option>
            <option value="not_interested">Not Interested</option>
          </select>
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No leads found</p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50 hover:bg-slate-700/70 transition-colors duration-200"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-white font-semibold">{lead.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceBadgeColor(lead.source)}`}>
                        {lead.source === 'landing_page' ? 'Landing Page' : 'Main Site'}
                      </span>
                      <span className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1 ${getStatusBadgeColor(lead.status || 'new')}`}>
                        {getStatusIcon(lead.status || 'new')}
                        {(lead.status || 'new').replace('_', ' ').charAt(0).toUpperCase() + (lead.status || 'new').replace('_', ' ').slice(1)}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-slate-300 text-sm">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {lead.email}
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {lead.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(lead.createdAt)}
                      </div>
                    </div>
                    {lead.message && (
                      <p className="text-slate-400 text-sm mt-2 line-clamp-2">
                        {lead.message}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(lead.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-slate-400 text-sm">Status:</label>
                  <select
                    value={lead.status || 'new'}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    className="px-3 py-1 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="not_interested">Not Interested</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}