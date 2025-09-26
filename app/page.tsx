import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold text-slate-900 mb-6">
            Generate Your Event Site
            <span className="block text-blue-600">In Minutes</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed">
            AI-powered white-label event sites with custom branding, automated emails,
            SMS notifications, and seamless deployment to your GitHub.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/start">
              <Button size="lg" className="text-lg px-8 py-3">
                Start Building
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="text-lg px-8 py-3">
              View Demo
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                🤖
              </div>
              <h3 className="text-lg font-semibold mb-2">AI-Generated Copy</h3>
              <p className="text-slate-600">
                Custom event copy, emails, and SMS messages generated specifically for your brand and audience.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                🎨
              </div>
              <h3 className="text-lg font-semibold mb-2">Custom Branding</h3>
              <p className="text-slate-600">
                Upload your logo, choose your colors, and get a fully branded event site ready to deploy.
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                🚀
              </div>
              <h3 className="text-lg font-semibold mb-2">Instant Deployment</h3>
              <p className="text-slate-600">
                Get a private GitHub repo with deployment instructions for Vercel, including all necessary configs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}