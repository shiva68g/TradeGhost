'use client'

import { useEffect, useRef } from 'react'

export function ViewTracker({ postId }: { postId: string }) {
  const tracked = useRef(false)
  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    }).catch(() => {})
  }, [postId])
  return null
}
