'use client'

import { useState } from 'react'

export default function AdminDebugPage() {
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const testCreateRepo = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/create-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId: 'test-order-id' })
      })
      
      const data = await res.json()
      setResponse(JSON.stringify({ 
        status: res.status, 
        data 
      }, null, 2))
    } catch (error) {
      setResponse(JSON.stringify({ 
        error: error?.toString() 
      }, null, 2))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Debug Panel</h1>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-8">
        <h2 className="text-xl font-semibold mb-4">Environment Info</h2>
        <p><strong>Node Version:</strong> {process.env.NODE_VERSION || 'Not available'}</p>
        <p><strong>Next.js Runtime:</strong> Client-side rendered</p>
        <p><strong>Build Time:</strong> {new Date().toISOString()}</p>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">API Test: /api/create-repo</h2>
        
        <button 
          onClick={testCreateRepo}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'POST /api/create-repo'}
        </button>

        {response && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Response:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {response}
            </pre>
          </div>
        )}
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Purpose:</strong> This validates runtime separation.</p>
          <p><strong>Expected:</strong> JSON response showing environment validation results.</p>
          <p><strong>Should NOT:</strong> Run during build time.</p>
        </div>
      </div>
    </div>
  )
}