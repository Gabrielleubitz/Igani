'use client'

import { useState, useEffect } from 'react'
import { SiteSettings } from '@/lib/getSiteSettings'

const defaultSettings: SiteSettings = {
  businessEmail: '',
  businessPhone: '',
  businessAddress: '',
  whatsappNumber: '',
  linkedinUrl: '',
  instagramUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  githubUrl: '',
  metaTitle: 'IGANI - Web Development & Design',
  metaDescription: 'Professional web development and design services',
  metaKeywords: 'web development, design, websites, digital solutions',
  adminNotificationEmail: '',
  enableLeadNotifications: true,
  enableInquiryNotifications: true,
  footerTagline: 'Building digital experiences that matter',
  copyrightText: '© 2024 IGANI. All rights reserved.'
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/admin/site-settings')
        if (response.ok) {
          const data = await response.json()
          setSettings({ ...defaultSettings, ...data })
        }
      } catch (error) {
        console.error('Error fetching site settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  return { settings, isLoading }
}
