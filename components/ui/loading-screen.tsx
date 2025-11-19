'use client'

import { IganiLoader } from './igani-loader'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center">
      <IganiLoader />
      {message && (
        <p className="text-slate-400 mt-8 text-lg font-medium animate-pulse">
          {message}
        </p>
      )}
    </div>
  )
}
