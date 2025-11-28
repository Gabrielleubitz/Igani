'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock, Save, AlertCircle, CheckCircle } from 'lucide-react'

interface OfferSettings {
  title: string
  endDate: string
  isActive: boolean
  lastUpdated?: string
}

export function OfferSettingsManager() {
  const [settings, setSettings] = useState<OfferSettings | null>(null)
  const [newTitle, setNewTitle] = useState('Black Friday Sale')
  const [newEndDate, setNewEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    if (settings?.endDate) {
      const timer = setInterval(updateTimeRemaining, 1000)
      return () => clearInterval(timer)
    }
  }, [settings?.endDate])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/offer-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        if (data.title) {
          setNewTitle(data.title)
        }
        if (data.endDate) {
          setNewEndDate(new Date(data.endDate).toISOString().slice(0, 16))
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load offer settings' })
    } finally {
      setIsLoading(false)
    }
  }

  const updateTimeRemaining = () => {
    if (!settings?.endDate) return

    const now = new Date()
    const endDate = new Date(settings.endDate)
    const timeDiff = endDate.getTime() - now.getTime()

    if (timeDiff <= 0) {
      setTimeRemaining(null)
      return
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)

    setTimeRemaining({ days, hours, minutes, seconds })
  }

  const handleSave = async () => {
    if (!newTitle.trim()) {
      setMessage({ type: 'error', text: 'Please enter a title' })
      return
    }
    if (!newEndDate) {
      setMessage({ type: 'error', text: 'Please select an end date' })
      return
    }

    try {
      setIsSaving(true)
      setMessage(null)

      const response = await fetch('/api/admin/offer-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTitle,
          endDate: new Date(newEndDate).toISOString(),
          isActive: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setMessage({ type: 'success', text: 'Offer settings updated successfully!' })
        
        setTimeout(() => setMessage(null), 3000)
      } else {
        const errorData = await response.text()
        console.error('API Error Response:', response.status, errorData)
        throw new Error(`Failed to save settings: ${response.status} - ${errorData}`)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage({ type: 'error', text: 'Failed to save offer settings' })
    } finally {
      setIsSaving(false)
    }
  }

  const isOfferExpired = () => {
    if (!settings?.endDate) return false
    return new Date() > new Date(settings.endDate)
  }

  if (isLoading) {
    return (
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded mb-4"></div>
          <div className="h-4 bg-slate-700 rounded mb-2"></div>
          <div className="h-4 bg-slate-700 rounded mb-6"></div>
          <div className="h-10 bg-slate-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
      <h2 className="text-xl font-bold text-white mb-6">Offer Timer Settings</h2>

      {/* Current Status */}
      {settings && (
        <div className="mb-6">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-3 h-3 rounded-full ${isOfferExpired() ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <h3 className="text-white font-semibold">
                {settings.title}: {isOfferExpired() ? 'Expired' : 'Active'}
              </h3>
            </div>
            
            {settings.endDate && (
              <div className="space-y-2 text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>End Date: {new Date(settings.endDate).toLocaleString('en-GB', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</span>
                </div>
                
                {timeRemaining && !isOfferExpired() && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      Time Remaining: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Update Settings */}
      <div className="space-y-4">
        <div>
          <label className="block text-white font-medium mb-2">
            Offer Title
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-400"
            placeholder="e.g., Black Friday Sale, Summer Special, Holiday Promo"
          />
          <p className="text-slate-400 text-xs mt-1">This will appear in the offer timer on the landing page</p>
        </div>

        <div>
          <label className="block text-white font-medium mb-2">
            End Date & Time
          </label>
          <input
            type="datetime-local"
            value={newEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-400"
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !newEndDate || !newTitle.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Update Offer Settings'}
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-blue-300 text-sm">
            <p className="font-medium mb-1">How the countdown works:</p>
            <ul className="space-y-1 text-blue-400">
              <li>• Set the exact date and time when your offer expires</li>
              <li>• The landing page will show a real-time countdown timer</li>
              <li>• When the time expires, visitors will see "Offer has ended" instead</li>
              <li>• Times are displayed in the visitor's local timezone</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}