'use client'

import { useEffect } from 'react'
import { clearIndexedDBStore } from '@/utils/indexedDB'

export function IndexedDBCleanup() {
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearIndexedDBStore()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  return null
} 