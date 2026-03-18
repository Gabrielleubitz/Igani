'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, Plus, Trash2, Copy, Check, AlertTriangle, RefreshCw, Eye, EyeOff, ShieldCheck, Clock, Calendar } from 'lucide-react'

interface ApiKeyRecord {
  id: string
  name: string
  maskedKey: string
  createdAt: string
  lastUsedAt: string | null
}

interface NewKeyResult {
  key: string
  record: ApiKeyRecord
}

function formatDate(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  )
}

function NewKeyBanner({ result, onDismiss }: { result: NewKeyResult; onDismiss: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(result.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 mb-6"
    >
      <div className="flex items-start gap-3 mb-4">
        <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-emerald-300 font-semibold text-sm">API key generated — copy it now</p>
          <p className="text-slate-400 text-xs mt-0.5">
            This key will <span className="text-white font-medium">never be shown again</span>. Store it somewhere safe (e.g. your n8n credentials vault).
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-600 rounded-xl px-4 py-3 font-mono text-sm">
        <span className="flex-1 text-white break-all">
          {revealed ? result.key : result.key.replace(/igsk_(.{4}).+(.{4})$/, 'igsk_$1' + '•'.repeat(24) + '$2')}
        </span>
        <button
          type="button"
          onClick={() => setRevealed(v => !v)}
          className="p-1.5 rounded text-slate-400 hover:text-white transition-colors flex-shrink-0"
          title={revealed ? 'Hide' : 'Reveal'}
        >
          {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors flex-shrink-0"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        I've saved it — dismiss
      </button>
    </motion.div>
  )
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newKeyResult, setNewKeyResult] = useState<NewKeyResult | null>(null)
  const [generating, setGenerating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/api-keys')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load keys')
      setKeys(data.keys ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadKeys() }, [loadKeys])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() || 'n8n Bot' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate key')
      setNewKeyResult(data)
      setNewKeyName('')
      await loadKeys()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setDeletingId(id)
    setConfirmDeleteId(null)
    try {
      const res = await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke key')
      }
      setKeys(prev => prev.filter(k => k.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Key className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">API Keys</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Generate secret keys so external services (like n8n) can authenticate with your API.
              Keys are hashed with SHA-256 before storage — only the masked version is kept.
            </p>
          </div>
        </div>

        {/* Usage example */}
        <div className="mt-5 rounded-xl bg-slate-900/60 border border-slate-700 p-4">
          <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Usage</p>
          <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
            {`Authorization: Bearer igsk_<your_key>`}
          </pre>
        </div>
      </div>

      {/* New key banner */}
      <AnimatePresence>
        {newKeyResult && (
          <NewKeyBanner result={newKeyResult} onDismiss={() => setNewKeyResult(null)} />
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Generate form */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <h4 className="text-sm font-semibold text-white mb-4">Generate new key</h4>
        <form onSubmit={handleGenerate} className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. n8n Bot)"
            maxLength={64}
            className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
          >
            {generating
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Plus className="w-4 h-4" />
            }
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </form>
      </div>

      {/* Keys list */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-white">
            Active keys
            {keys.length > 0 && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                {keys.length}
              </span>
            )}
          </h4>
          <button
            type="button"
            onClick={loadKeys}
            disabled={loading}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-12 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Key className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No API keys yet. Generate one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {keys.map((key) => (
              <motion.div
                key={key.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-6 py-4 flex items-center gap-4"
              >
                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Key className="w-4 h-4 text-violet-400" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm truncate">{key.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <code className="text-slate-400 text-xs font-mono">{key.maskedKey}</code>
                    <CopyButton text={key.maskedKey} />
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Created {formatDate(key.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last used: {formatDate(key.lastUsedAt)}
                    </span>
                  </div>
                </div>

                {/* Revoke */}
                <div className="flex-shrink-0">
                  {confirmDeleteId === key.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400">Sure?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(key.id)}
                        disabled={deletingId === key.id}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors"
                      >
                        {deletingId === key.id ? 'Revoking…' : 'Yes, revoke'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDelete(key.id)}
                      disabled={!!deletingId}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 text-xs font-medium transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Revoke
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* n8n integration hint */}
      <div className="bg-slate-800/40 rounded-2xl border border-slate-700/30 p-6">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          Using with n8n
        </h4>
        <ol className="space-y-2 text-sm text-slate-400">
          <li className="flex gap-2"><span className="text-slate-500 font-mono text-xs mt-0.5">1.</span> Generate a key above and copy it immediately.</li>
          <li className="flex gap-2"><span className="text-slate-500 font-mono text-xs mt-0.5">2.</span> In n8n, create a new <span className="text-white">Header Auth</span> credential with name <code className="text-xs bg-slate-700 px-1 py-0.5 rounded">Authorization</code> and value <code className="text-xs bg-slate-700 px-1 py-0.5 rounded">Bearer igsk_…</code></li>
          <li className="flex gap-2"><span className="text-slate-500 font-mono text-xs mt-0.5">3.</span> Attach that credential to your HTTP Request nodes that call <code className="text-xs bg-slate-700 px-1 py-0.5 rounded">igani.co/api/*</code> protected routes.</li>
          <li className="flex gap-2"><span className="text-slate-500 font-mono text-xs mt-0.5">4.</span> Revoke a key at any time from this panel to immediately block access.</li>
        </ol>
      </div>
    </div>
  )
}
