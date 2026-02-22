'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminAboutRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin?tab=about')
  }, [router])

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <p className="text-slate-400">Redirecting to About Us...</p>
    </div>
  )
}
