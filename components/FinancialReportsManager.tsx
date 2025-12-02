'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ContactSubmission, Expense } from '@/types'
import {
  getContactSubmissions,
  getExpenses,
  saveExpense,
  updateExpense,
  deleteExpense
} from '@/lib/firestore'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  FileSpreadsheet,
  Receipt,
  Wallet,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import * as XLSX from 'xlsx'

interface FinancialReportsManagerProps {}

// Currency conversion rates
const EXCHANGE_RATES: { [key: string]: number } = {
  '₪': 1,
  '$': 3.65,
  '€': 4.0,
  'USD': 3.65,
  'EUR': 4.0,
  'ILS': 1
}

export function FinancialReportsManager({}: FinancialReportsManagerProps) {
  const [inquiries, setInquiries] = useState<ContactSubmission[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  // Month selection - default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [newExpense, setNewExpense] = useState({
    amount: 0,
    currency: '₪',
    description: '',
    category: 'Operations',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [inquiriesData, expensesData] = await Promise.all([
        getContactSubmissions(),
        getExpenses()
      ])
      setInquiries(inquiriesData)
      setExpenses(expensesData)
    } catch (error) {
      console.error('Error loading financial data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const convertToILS = (amount: number, currency: string): number => {
    const rate = EXCHANGE_RATES[currency] || EXCHANGE_RATES[currency.replace(/[^A-Z]/g, '')] || 1
    return amount * rate
  }

  // Get all available months from data
  const availableMonths = useMemo(() => {
    const months = new Set<string>()

    // Add months from completed inquiries (use completedAt if available, otherwise submittedAt)
    inquiries
      .filter(inquiry => inquiry.status === 'completed' && inquiry.quotedPrice)
      .forEach(inquiry => {
        const date = inquiry.completedAt || inquiry.submittedAt
        const month = date.substring(0, 7) // YYYY-MM
        months.add(month)
      })

    // Add months from expenses
    expenses.forEach(expense => {
      const month = expense.date.substring(0, 7)
      months.add(month)
    })

    return Array.from(months).sort().reverse()
  }, [inquiries, expenses])

  // Filter data by selected month
  const monthlyData = useMemo(() => {
    // Revenue: use completedAt if available, otherwise fall back to submittedAt
    const revenue = inquiries
      .filter(inquiry => {
        if (!inquiry.quotedPrice || inquiry.status !== 'completed') return false
        const date = inquiry.completedAt || inquiry.submittedAt
        return date.startsWith(selectedMonth)
      })
      .map(inquiry => ({
        ...inquiry,
        amountInILS: convertToILS(inquiry.quotedPrice || 0, inquiry.currency || '₪'),
        displayDate: inquiry.completedAt || inquiry.submittedAt
      }))

    const monthExpenses = expenses
      .filter(expense => expense.date.startsWith(selectedMonth))
      .map(expense => ({
        ...expense,
        amountInILS: convertToILS(expense.amount, expense.currency)
      }))

    const totalRevenue = revenue.reduce((sum, item) => sum + item.amountInILS, 0)
    const totalExpenses = monthExpenses.reduce((sum, item) => sum + item.amountInILS, 0)

    return {
      revenue,
      expenses: monthExpenses,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses
    }
  }, [inquiries, expenses, selectedMonth])

  // Navigate months
  const changeMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const date = new Date(year, month - 1, 1)

    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1)
    } else {
      date.setMonth(date.getMonth() + 1)
    }

    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(newMonth)
  }

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
  }

  const handleSaveExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      setSaveError('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      await saveExpense(newExpense)
      setShowExpenseModal(false)
      setNewExpense({
        amount: 0,
        currency: '₪',
        description: '',
        category: 'Operations',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      await loadData()

      setSaveSuccess('Expense added successfully!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setSaveSuccess(null), 5000)
    } catch (error) {
      console.error('Error saving expense:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save expense')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateExpense = async () => {
    if (!editingExpense) return

    setIsSaving(true)
    setSaveError(null)

    try {
      await updateExpense(editingExpense)
      setEditingExpense(null)
      await loadData()

      setSaveSuccess('Expense updated successfully!')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setTimeout(() => setSaveSuccess(null), 5000)
    } catch (error) {
      console.error('Error updating expense:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to update expense')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      await deleteExpense(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const exportMonthToExcel = () => {
    const wb = XLSX.utils.book_new()
    const data: any[] = []

    // Title
    data.push([`IGANI - Financial Report - ${formatMonthDisplay(selectedMonth)}`])
    data.push([`Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}`])
    data.push([])

    // REVENUE SECTION
    data.push(['REVENUE', '', '', '', '', '', ''])
    data.push(['Completion Date', 'Project Type', 'Client Name', 'Email', 'Original Amount', 'Currency', 'Amount (ILS)'])

    monthlyData.revenue.forEach(item => {
      data.push([
        new Date(item.displayDate).toLocaleDateString('en-GB'),
        item.projectType,
        `${item.firstName} ${item.lastName}`,
        item.email,
        item.quotedPrice || 0,
        item.currency || '₪',
        item.amountInILS.toFixed(2)
      ])
    })

    data.push([])
    data.push(['', '', '', '', 'SUBTOTAL:', monthlyData.totalRevenue.toFixed(2), ''])
    data.push([])

    // EXPENSES SECTION
    data.push(['EXPENSES', '', '', '', '', '', ''])
    data.push(['Date', 'Description', 'Category', 'Original Amount', 'Currency', 'Amount (ILS)', 'Notes'])

    monthlyData.expenses.forEach(item => {
      data.push([
        item.date,
        item.description,
        item.category,
        item.amount,
        item.currency,
        item.amountInILS.toFixed(2),
        item.notes || ''
      ])
    })

    data.push([])
    data.push(['', '', '', 'SUBTOTAL:', monthlyData.totalExpenses.toFixed(2), '', ''])
    data.push([])
    data.push([])

    // SUMMARY
    data.push(['MONTHLY SUMMARY', '', '', '', '', '', ''])
    data.push([])
    data.push(['Total Revenue (ILS):', '', '', '', '', monthlyData.totalRevenue.toFixed(2), ''])
    data.push(['Total Expenses (ILS):', '', '', '', '', monthlyData.totalExpenses.toFixed(2), ''])
    data.push(['Net Profit/Loss (ILS):', '', '', '', '', monthlyData.netProfit.toFixed(2), ''])

    const ws = XLSX.utils.aoa_to_sheet(data)

    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 30 }
    ]

    XLSX.utils.book_append_sheet(wb, ws, formatMonthDisplay(selectedMonth).substring(0, 31))

    const fileName = `IGANI_Financial_${selectedMonth}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    )
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
              <DollarSign className="w-5 h-5" />
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

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Financial Reports</h2>
          <p className="text-slate-400 text-sm">Track monthly revenue, expenses, and export reports</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-cyan-500/20 font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
          <button
            onClick={exportMonthToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-300 shadow-lg shadow-green-500/20 font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Month
          </button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => changeMonth('prev')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h3 className="text-2xl font-bold text-white">{formatMonthDisplay(selectedMonth)}</h3>
          </div>

          <button
            onClick={() => changeMonth('next')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {availableMonths.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {availableMonths.map(month => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-3 py-1 text-sm rounded-lg transition-all ${
                  month === selectedMonth
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {formatMonthDisplay(month)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ₪{monthlyData.totalRevenue.toFixed(2)}
          </div>
          <div className="text-slate-300 text-sm">Monthly Revenue</div>
          <div className="text-slate-400 text-xs mt-2">{monthlyData.revenue.length} completed projects</div>
        </div>

        <div className="bg-gradient-to-br from-red-600/20 to-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ₪{monthlyData.totalExpenses.toFixed(2)}
          </div>
          <div className="text-slate-300 text-sm">Monthly Expenses</div>
          <div className="text-slate-400 text-xs mt-2">{monthlyData.expenses.length} recorded expenses</div>
        </div>

        <div className={`bg-gradient-to-br ${monthlyData.netProfit >= 0 ? 'from-cyan-600/20 to-blue-500/10 border-cyan-500/30' : 'from-orange-600/20 to-orange-500/10 border-orange-500/30'} border rounded-2xl p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${monthlyData.netProfit >= 0 ? 'bg-cyan-500/20' : 'bg-orange-500/20'} rounded-xl flex items-center justify-center`}>
              <DollarSign className={`w-6 h-6 ${monthlyData.netProfit >= 0 ? 'text-cyan-400' : 'text-orange-400'}`} />
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-2">
            ₪{monthlyData.netProfit.toFixed(2)}
          </div>
          <div className="text-slate-300 text-sm">Net Profit</div>
          <div className="text-slate-400 text-xs mt-2">
            {monthlyData.netProfit >= 0 ? 'Positive balance' : 'Negative balance'}
          </div>
        </div>
      </div>

      {/* Revenue Details */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-green-400" />
          Revenue - {formatMonthDisplay(selectedMonth)}
        </h3>
        <div className="space-y-3">
          {monthlyData.revenue.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No revenue this month</p>
          ) : (
            monthlyData.revenue.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900/60 rounded-lg p-4 border border-slate-700/50 hover:border-green-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">
                        {item.firstName} {item.lastName}
                      </h4>
                      <span className="text-xs px-2 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/30">
                        Completed
                      </span>
                    </div>
                    <p className="text-slate-300 text-sm mb-2">{item.projectType}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(item.displayDate).toLocaleDateString('en-GB')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Receipt className="w-4 h-4" />
                        {item.currency}{item.quotedPrice}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">ILS</div>
                    <div className="text-xl font-bold text-green-400">
                      ₪{item.amountInILS.toFixed(2)}
                    </div>
                    {item.currency !== '₪' && (
                      <div className="text-xs text-slate-500 mt-1">
                        ({item.currency}{item.quotedPrice})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Expenses Details */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Receipt className="w-5 h-5 text-red-400" />
          Expenses - {formatMonthDisplay(selectedMonth)}
        </h3>
        <div className="space-y-3">
          {monthlyData.expenses.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No expenses this month</p>
          ) : (
            monthlyData.expenses.map((expense) => (
              <div
                key={expense.id}
                className="bg-slate-900/60 rounded-lg p-4 border border-slate-700/50 hover:border-red-500/30 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">{expense.description}</h4>
                      <span className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded-full">
                        {expense.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {expense.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {expense.currency}{expense.amount}
                      </span>
                    </div>
                    {expense.notes && (
                      <p className="text-slate-400 text-sm">{expense.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right mr-4">
                      <div className="text-sm text-slate-400 mb-1">ILS</div>
                      <div className="text-xl font-bold text-red-400">
                        ₪{expense.amountInILS.toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingExpense(expense)}
                      className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-all"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 w-full max-w-2xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault()
                  handleSaveExpense()
                }
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Add New Expense</h2>
                <button
                  onClick={() => {
                    setShowExpenseModal(false)
                    setSaveError(null)
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Date *</label>
                    <input
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Category *</label>
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option>Operations</option>
                      <option>Marketing</option>
                      <option>Software & Tools</option>
                      <option>Hosting & Domains</option>
                      <option>Freelancers</option>
                      <option>Office</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Description *</label>
                  <input
                    type="text"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                    placeholder="e.g., Adobe Creative Cloud subscription"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Amount *</label>
                    <input
                      type="number"
                      value={newExpense.amount || ''}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                      placeholder="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Currency *</label>
                    <select
                      value={newExpense.currency}
                      onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option value="₪">₪ (ILS)</option>
                      <option value="$">$ (USD)</option>
                      <option value="€">€ (EUR)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Notes</label>
                  <textarea
                    value={newExpense.notes}
                    onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                    placeholder="Additional notes..."
                  />
                </div>

                {saveError && (
                  <div className="p-4 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg">
                    <p className="text-sm">{saveError}</p>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-700/50">
                  <button
                    onClick={() => {
                      setShowExpenseModal(false)
                      setSaveError(null)
                    }}
                    className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveExpense}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    {isSaving ? 'Saving...' : 'Add Expense'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Expense Modal */}
      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 w-full max-w-2xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                  e.preventDefault()
                  handleUpdateExpense()
                }
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Edit Expense</h2>
                <button
                  onClick={() => {
                    setEditingExpense(null)
                    setSaveError(null)
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Date *</label>
                    <input
                      type="date"
                      value={editingExpense.date}
                      onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Category *</label>
                    <select
                      value={editingExpense.category}
                      onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option>Operations</option>
                      <option>Marketing</option>
                      <option>Software & Tools</option>
                      <option>Hosting & Domains</option>
                      <option>Freelancers</option>
                      <option>Office</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Description *</label>
                  <input
                    type="text"
                    value={editingExpense.description}
                    onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-medium mb-2">Amount *</label>
                    <input
                      type="number"
                      value={editingExpense.amount || ''}
                      onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Currency *</label>
                    <select
                      value={editingExpense.currency}
                      onChange={(e) => setEditingExpense({ ...editingExpense, currency: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white"
                    >
                      <option value="₪">₪ (ILS)</option>
                      <option value="$">$ (USD)</option>
                      <option value="€">€ (EUR)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Notes</label>
                  <textarea
                    value={editingExpense.notes || ''}
                    onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 text-white placeholder-slate-500"
                  />
                </div>

                {saveError && (
                  <div className="p-4 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg">
                    <p className="text-sm">{saveError}</p>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-700/50">
                  <button
                    onClick={() => {
                      setEditingExpense(null)
                      setSaveError(null)
                    }}
                    className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateExpense}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
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
    </div>
  )
}
