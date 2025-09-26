'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { QuestionnaireForm } from '@/components/QuestionnaireForm'
import { createOrder, saveQuestionnaire } from '@/lib/actions'
import { QuestionnaireData } from '@/lib/types'

export default function StartPage() {
  const [step, setStep] = useState(1)
  const [orderId, setOrderId] = useState<string | null>(null)
  const router = useRouter()

  const handleQuestionnaireSubmit = async (data: QuestionnaireData) => {
    try {
      let currentOrderId = orderId
      
      if (!currentOrderId) {
        const order = await createOrder()
        currentOrderId = order.id
        setOrderId(currentOrderId)
      }

      await saveQuestionnaire(currentOrderId, data)
      router.push(`/checkout?orderId=${currentOrderId}`)
    } catch (error) {
      console.error('Error submitting questionnaire:', error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              Let's Build Your Event Site
            </h1>
            <p className="text-slate-600">
              Answer a few questions to generate custom copy and branding for your event site.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-8">
            <QuestionnaireForm onSubmit={handleQuestionnaireSubmit} />
          </div>
        </div>
      </div>
    </div>
  )
}