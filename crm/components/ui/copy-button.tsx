'use client'

import { useState } from 'react'
import { Button } from './button'

/** Copies text to the clipboard and briefly confirms. */
export function CopyButton({ text, label = 'Copy link' }: { text: string; label?: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        void navigator.clipboard
          ?.writeText(text)
          .then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1800)
          })
          .catch(() => window.prompt('Copy this link:', text))
      }}
    >
      {copied ? '✓ Copied' : label}
    </Button>
  )
}
