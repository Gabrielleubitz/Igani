'use client'

import { useState, useRef } from 'react'
import { Upload, Link2, Loader2 } from 'lucide-react'
import { uploadAdminImage } from '@/lib/uploadAdminImage'

interface AdminImageFieldProps {
  value: string
  onChange: (url: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
  accept?: string
  previewSize?: 'sm' | 'md' | 'lg'
}

export function AdminImageField({
  value,
  onChange,
  label = 'Image',
  placeholder = 'https://example.com/image.jpg',
  disabled = false,
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  previewSize = 'md'
}: AdminImageFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const previewClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    try {
      const url = await uploadAdminImage(file)
      onChange(url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-white font-medium">{label}</label>
      )}
      <div className="flex flex-wrap items-start gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {uploading ? 'Uploading…' : 'Upload image'}
        </button>
        <span className="text-slate-500 text-sm flex items-center gap-1">
          <Link2 className="w-4 h-4" />
          Or paste URL:
        </span>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className="flex-1 min-w-[200px] px-4 py-2.5 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 disabled:opacity-50"
        />
      </div>
      {uploadError && (
        <p className="text-red-400 text-sm">{uploadError}</p>
      )}
      {value && (
        <div className="mt-2">
          <img
            src={value}
            alt="Preview"
            className={`rounded-lg object-cover border border-slate-600 ${previewClasses[previewSize]}`}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}
    </div>
  )
}
