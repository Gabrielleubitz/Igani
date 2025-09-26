'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { QuestionnaireData, QuestionnaireSchema } from '@/lib/types'

interface QuestionnaireFormProps {
  onSubmit: (data: QuestionnaireData) => Promise<void>
}

export function QuestionnaireForm({ onSubmit }: QuestionnaireFormProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues
  } = useForm<QuestionnaireData>({
    defaultValues: {
      brand: {
        name: '',
        tagline: '',
        tone: 'simple'
      },
      location: '',
      audience: {
        founders: 40,
        builders: 40,
        investors: 20
      },
      colors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6'
      },
      email: {
        senderDomain: ''
      },
      sms: {
        country: 'US'
      },
      event: {
        cadence: 'monthly',
        sampleName: ''
      }
    }
  })

  const totalSteps = 4

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const onFormSubmit = async (data: QuestionnaireData) => {
    try {
      const validated = QuestionnaireSchema.parse(data)
      setLoading(true)
      await onSubmit(validated)
    } catch (error) {
      console.error('Validation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Brand & Tone</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="brandName">Brand Name *</Label>
                <Input
                  id="brandName"
                  {...register('brand.name', { required: 'Brand name is required' })}
                  placeholder="TechMeetup SF"
                />
                {errors.brand?.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.brand.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="tagline">Tagline *</Label>
                <Input
                  id="tagline"
                  {...register('brand.tagline', { required: 'Tagline is required' })}
                  placeholder="Where builders meet builders"
                />
                {errors.brand?.tagline && (
                  <p className="text-red-500 text-sm mt-1">{errors.brand.tagline.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="tone">Brand Tone *</Label>
                <select
                  id="tone"
                  {...register('brand.tone')}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="simple">Simple & Clear</option>
                  <option value="energetic">Energetic & Fun</option>
                  <option value="formal">Professional & Formal</option>
                </select>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Location & Audience</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="location">Event Location *</Label>
                <Input
                  id="location"
                  {...register('location', { required: 'Location is required' })}
                  placeholder="San Francisco, CA"
                />
                {errors.location && (
                  <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
                )}
              </div>

              <div>
                <Label>Audience Breakdown (%) *</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label htmlFor="founders" className="text-sm">Founders</Label>
                    <Input
                      id="founders"
                      type="number"
                      min="0"
                      max="100"
                      {...register('audience.founders', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="builders" className="text-sm">Builders</Label>
                    <Input
                      id="builders"
                      type="number"
                      min="0"
                      max="100"
                      {...register('audience.builders', { valueAsNumber: true })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="investors" className="text-sm">Investors</Label>
                    <Input
                      id="investors"
                      type="number"
                      min="0"
                      max="100"
                      {...register('audience.investors', { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Branding & Design</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor">Primary Color *</Label>
                  <Input
                    id="primaryColor"
                    type="color"
                    {...register('colors.primary')}
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color *</Label>
                  <Input
                    id="secondaryColor"
                    type="color"
                    {...register('colors.secondary')}
                    className="h-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="logo">Logo Upload</Label>
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setValue('logo', file.name)
                    }
                  }}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Upload your logo (PNG, JPG, SVG supported)
                </p>
              </div>

              <div>
                <Label htmlFor="heroImage">Hero Image Upload</Label>
                <Input
                  id="heroImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setValue('heroImage', file.name)
                    }
                  }}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Upload a hero image for your event site
                </p>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Communication & Events</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="senderDomain">Email Sender Domain *</Label>
                <Input
                  id="senderDomain"
                  {...register('email.senderDomain', { required: 'Sender domain is required' })}
                  placeholder="techmeetup.com"
                />
                {errors.email?.senderDomain && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.senderDomain.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="smsCountry">SMS Country *</Label>
                <select
                  id="smsCountry"
                  {...register('sms.country')}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>

              <div>
                <Label htmlFor="cadence">Event Cadence *</Label>
                <select
                  id="cadence"
                  {...register('event.cadence')}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <Label htmlFor="sampleEventName">Sample Event Name *</Label>
                <Input
                  id="sampleEventName"
                  {...register('event.sampleName', { required: 'Sample event name is required' })}
                  placeholder="AI & Machine Learning Meetup #47"
                />
                {errors.event?.sampleName && (
                  <p className="text-red-500 text-sm mt-1">{errors.event.sampleName.message}</p>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-gray-500">
            Step {step} of {totalSteps}
          </span>
          <div className="flex space-x-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i + 1 <= step ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {renderStep()}

      <div className="flex justify-between mt-8">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={step === 1}
        >
          Previous
        </Button>
        
        {step < totalSteps ? (
          <Button type="button" onClick={nextStep}>
            Next
          </Button>
        ) : (
          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Complete & Proceed to Checkout'}
          </Button>
        )}
      </div>
    </form>
  )
}