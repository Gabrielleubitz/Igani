'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { generateCopy, createBuyerRepo } from '@/lib/actions'
import { CheckCircle, Download, ExternalLink, RefreshCw, Github } from 'lucide-react'

interface OrderPortalProps {
  order: any // Would be properly typed in production
}

export function OrderPortal({ order }: OrderPortalProps) {
  const [regenerating, setRegenerating] = useState(false)
  const [creatingRepo, setCreatingRepo] = useState(false)

  const handleRegenerateCopy = async () => {
    setRegenerating(true)
    try {
      await generateCopy(order.id)
      window.location.reload()
    } catch (error) {
      console.error('Error regenerating copy:', error)
    } finally {
      setRegenerating(false)
    }
  }

  const handleCreateRepo = async () => {
    setCreatingRepo(true)
    try {
      await createBuyerRepo(order.id)
      window.location.reload()
    } catch (error) {
      console.error('Error creating repo:', error)
    } finally {
      setCreatingRepo(false)
    }
  }

  const brandName = (order.generatedCopy?.site as any)?.brandName || 'Your Event Site'
  const repoName = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-')

  return (
    <div className="space-y-8">
      {/* Order Status */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              Payment Successful!
            </h3>
            <p className="text-green-700">
              Order #{order.id.slice(0, 8)} - {order.license?.plan.toUpperCase()} plan
            </p>
          </div>
        </div>
      </div>

      {/* Repository Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Github className="h-5 w-5 mr-2" />
          Your Repository
        </h3>
        
        {order.delivery?.repoUrl ? (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-md">
              <p className="font-medium mb-2">Repository Created:</p>
              <a 
                href={order.delivery.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center"
              >
                {order.delivery.repoUrl}
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            </div>
            
            <div className="flex space-x-3">
              <Button onClick={handleRegenerateCopy} disabled={regenerating} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                Regenerate Copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-slate-600">
              Create a private repository in your GitHub account with your event site code.
            </p>
            <Button 
              onClick={handleCreateRepo} 
              disabled={creatingRepo}
              className="flex items-center"
            >
              {creatingRepo ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating Repository...
                </>
              ) : (
                <>
                  <Github className="h-4 w-4 mr-2" />
                  Create GitHub Repository
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Download Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center">
          <Download className="h-5 w-5 mr-2" />
          Download ZIP
        </h3>
        
        <p className="text-slate-600 mb-4">
          Alternative download as a ZIP file if you prefer to set up the repository manually.
        </p>
        
        <a 
          href={`/api/download/${order.id}`}
          className="inline-flex items-center"
        >
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download ZIP File
          </Button>
        </a>
      </div>

      {/* Deploy Instructions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold mb-4">Deployment Instructions</h3>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">1. Database Setup</h4>
            <p className="text-slate-600 mb-3">Choose one of these database options:</p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-slate-900">Supabase (Recommended)</h5>
                <p className="text-sm text-slate-600 mt-1">
                  Free tier available, PostgreSQL-compatible
                </p>
                <a 
                  href="https://supabase.com/dashboard/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center mt-2"
                >
                  Create Supabase Project
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
              
              <div className="border rounded-lg p-4">
                <h5 className="font-medium text-slate-900">Firebase</h5>
                <p className="text-sm text-slate-600 mt-1">
                  Google's platform with Firestore
                </p>
                <a 
                  href="https://console.firebase.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm flex items-center mt-2"
                >
                  Create Firebase Project
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">2. Email Setup</h4>
            <p className="text-slate-600 mb-3">Configure email sending:</p>
            
            <div className="bg-slate-50 p-4 rounded-md">
              <h5 className="font-medium text-slate-900">Mailjet (Recommended)</h5>
              <p className="text-sm text-slate-600 mt-1 mb-2">
                Reliable email delivery with good free tier
              </p>
              <a 
                href="https://www.mailjet.com/signup/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm flex items-center"
              >
                Sign up for Mailjet
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">3. Deploy to Vercel</h4>
            <p className="text-slate-600 mb-3">
              One-click deployment to Vercel with automatic HTTPS and global CDN.
            </p>
            
            <a 
              href={`https://vercel.com/new/clone?repository-url=${encodeURIComponent(order.delivery?.repoUrl || `https://github.com/buyer-username/${repoName}`)}&project-name=${encodeURIComponent(repoName)}&env=PUBLIC_SITE_URL,DATABASE_URL,MAILJET_API_KEY,MAILJET_API_SECRET`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button className="flex items-center">
                Deploy to Vercel
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Environment Variables Checklist */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-xl font-semibold mb-4">Environment Variables Checklist</h3>
        
        <div className="space-y-3">
          {[
            { key: 'PUBLIC_SITE_URL', desc: 'Your deployed site URL (e.g., https://events.yourcompany.com)' },
            { key: 'DATABASE_URL', desc: 'Database connection string from Supabase or Firebase' },
            { key: 'MAILJET_API_KEY', desc: 'From your Mailjet dashboard' },
            { key: 'MAILJET_API_SECRET', desc: 'From your Mailjet dashboard' }
          ].map((env) => (
            <div key={env.key} className="flex items-start space-x-3">
              <input type="checkbox" className="mt-1" />
              <div>
                <code className="text-sm bg-slate-100 px-2 py-1 rounded font-mono">
                  {env.key}
                </code>
                <p className="text-sm text-slate-600 mt-1">{env.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Support */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
        <p className="text-blue-800">
          Having trouble with setup? Email us at{' '}
          <a href="mailto:support@igani.co" className="underline">
            support@igani.co
          </a>
          {' '}and we'll help you get your event site deployed.
        </p>
      </div>
    </div>
  )
}