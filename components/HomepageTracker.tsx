'use client'

import { useEffect } from 'react'

const SESSION_KEY = 'igani_home_tracker_session_id'

function getSessionId() {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing
    const nextId = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, nextId)
    return nextId
  } catch {
    return crypto.randomUUID()
  }
}

function getViewDate(timestamp: Date) {
  return timestamp.toISOString().slice(0, 10)
}

export function HomepageTracker() {
  useEffect(() => {
    const now = new Date()
    const sessionId = getSessionId()
    const pageKey = 'home'
    const viewDate = getViewDate(now)
    const compositeId = `${pageKey}_${sessionId}_${viewDate}`

    void fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        pageKey,
        sessionId,
        compositeId,
        timestamp: now.toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer || null,
      }),
    })
  }, [])

  return null
}
