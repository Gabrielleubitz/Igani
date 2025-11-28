'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Filter, 
  Download, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Clock,
  Github,
  Mail
} from 'lucide-react'

interface AdminDashboardProps {
  orders: any[]
}

export function AdminDashboard({ orders }: AdminDashboardProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false
    }
    
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.createdAt)
      const now = new Date()
      const daysDiff = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
      
      switch (dateFilter) {
        case 'today':
          if (daysDiff > 0) return false
          break
        case 'week':
          if (daysDiff > 7) return false
          break
        case 'month':
          if (daysDiff > 30) return false
          break
      }
    }
    
    return true
  })

  const stats = {
    total: orders.length,
    paid: orders.filter(o => o.status === 'PAID').length,
    draft: orders.filter(o => o.status === 'DRAFT').length,
    failed: orders.filter(o => o.status === 'FAILED').length,
    totalRevenue: orders
      .filter(o => o.status === 'PAID')
      .reduce((sum, o) => sum + (o.amount / 100), 0)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PAID: 'default',
      DRAFT: 'secondary',
      FAILED: 'destructive'
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.toLowerCase()}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-slate-600">Total Orders</h3>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-slate-600">Paid Orders</h3>
          <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-slate-600">Draft Orders</h3>
          <p className="text-2xl font-bold text-yellow-600">{stats.draft}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-slate-600">Failed Orders</h3>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-slate-600">Revenue</h3>
          <p className="text-2xl font-bold text-slate-900">${stats.totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="all">All Status</option>
            <option value="PAID">Paid</option>
            <option value="DRAFT">Draft</option>
            <option value="FAILED">Failed</option>
          </select>
          
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border rounded px-3 py-1 text-sm"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          
          <div className="ml-auto">
            <Button variant="outline" size="sm">
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Order</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Brand</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Plan</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Amount</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(order.status)}
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                        {order.id.slice(0, 8)}
                      </code>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {order.customer.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.customer.email || 'No email'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-slate-900">
                      {(order.generatedCopy?.site as any)?.brandName || 
                       (order.questionnaire?.answers as any)?.brand?.name || 
                       'Unknown'}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">
                      {order.license?.plan?.toUpperCase() || 'N/A'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      ${(order.amount / 100).toFixed(2)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-1">
                      {order.status === 'PAID' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0"
                          >
                            <a
                              href={`/orders/${order.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          
                          {order.delivery?.repoUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 w-8 p-0"
                            >
                              <a
                                href={order.delivery.repoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Github className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0"
                          >
                            <a href={`/api/download/${order.id}`}>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                          
                          {order.customer.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 w-8 p-0"
                            >
                              <a href={`mailto:${order.customer.email}`}>
                                <Mail className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredOrders.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No orders found matching the current filters.
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Database</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Stripe Webhook</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">OpenAI API</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">GitHub App</span>
          </div>
        </div>
      </div>
    </div>
  )
}