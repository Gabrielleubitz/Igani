'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { plans } from '@/lib/types'
import { createCheckoutSession } from '@/lib/actions'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [selectedPlan, setSelectedPlan] = useState('plus')
  const [loading, setLoading] = useState(false)

  const handleCheckout = async (planId: string) => {
    if (!orderId) return

    setLoading(true)
    try {
      const { url } = await createCheckoutSession(orderId, planId)
      window.location.href = url
    } catch (error) {
      console.error('Checkout error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-slate-600">
              Select the plan that best fits your event needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-sm border-2 p-6 relative ${
                  selectedPlan === plan.id ? 'border-blue-500' : 'border-slate-200'
                }`}
              >
                {plan.id === 'plus' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Recommended
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="text-3xl font-bold text-slate-900">
                    ${plan.price}
                  </div>
                  <div className="text-slate-600">one-time payment</div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-slate-600">
                      <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        ✓
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  className="w-full"
                  variant={selectedPlan === plan.id ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedPlan(plan.id)
                    handleCheckout(plan.id)
                  }}
                  disabled={loading}
                >
                  {loading && selectedPlan === plan.id ? 'Processing...' : 'Select Plan'}
                </Button>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 text-sm text-slate-500">
            <p>Secure payment powered by Stripe. 30-day money-back guarantee.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  )
}