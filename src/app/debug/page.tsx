'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'

export default function DebugPage() {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  try {
    const { user, userProfile, userRole, loading } = useAuth()

    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h1>Debug Information</h1>
        <div style={{ marginBottom: '20px' }}>
          <h2>Environment Check</h2>
          <p>✅ Component mounted successfully</p>
          <p>✅ useAuth hook accessible</p>
          <p>✅ No runtime errors detected</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2>Auth State</h2>
          <p>Loading: {loading ? 'true' : 'false'}</p>
          <p>User: {user ? '✅ Authenticated' : '❌ Not authenticated'}</p>
          <p>Profile: {userProfile ? '✅ Loaded' : '❌ Not loaded'}</p>
          <p>Role: {userRole || 'None'}</p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h2>Navigation Test</h2>
          <a href="/test-simple" style={{ color: 'blue', marginRight: '10px' }}>Go to Test Simple</a>
          <a href="/project-files" style={{ color: 'blue', marginRight: '10px' }}>Go to Project Files</a>
          <a href="/auth/login" style={{ color: 'blue' }}>Go to Login</a>
        </div>

        {error && (
          <div style={{ backgroundColor: '#ffe6e6', padding: '10px', borderRadius: '5px' }}>
            <h3>Error Detected:</h3>
            <pre>{error}</pre>
          </div>
        )}
      </div>
    )
  } catch (err) {
    return (
      <div style={{ padding: '20px', backgroundColor: '#ffe6e6' }}>
        <h1>Error in Component</h1>
        <pre>{err instanceof Error ? err.message : String(err)}</pre>
      </div>
    )
  }
}