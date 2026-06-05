'use client'

import { useState } from 'react'
import { apiFetch } from '@/lib/api'

interface Props {
  prospect: any
  onClose: () => void
}

export default function EmailGeneratorModal({ prospect, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState<{ sujet: string, corps: string } | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generer = async () => {
    setLoading(true)
    setError('')
    setEmail(null)

    const res = await apiFetch('/api/emails/generate', {
      method: 'POST',
      body: JSON.stringify({ prospect })
    })

    if (!res.ok) {
      setError('Erreur lors de la génération')
      setLoading(false)
      return
    }

    const data = await res.json()
    setEmail(data)
    setLoading(false)
  }

  const copier = () => {
    if (!email) return
    navigator.clipboard.writeText(`Objet : ${email.sujet}\n\n${email.corps}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Génère automatiquement à l'ouverture
  useState(() => { generer() })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-3xl rounded-2xl p-6 space-y-5"
        style={{ backgroundColor: '#0a0f1e', border: '1px solid rgba(0,245,255,0.2)', boxShadow: '0 0 40px rgba(0,245,255,0.1)' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Email IA</h3>
            <p className="text-white/40 text-sm">{prospect.nom_entreprise}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition text-xl">✕</button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin mx-auto" />
            <p className="text-white/40 text-sm">Génération en cours...</p>
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div className="text-red-400 text-sm bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Email généré */}
        {email && !loading && (
          <div className="space-y-4">
            {/* Sujet */}
            <div>
              <label className="text-xs text-white/40 tracking-widest mb-2 block">OBJET</label>
              <input
                value={email.sujet}
                onChange={e => setEmail(prev => prev ? { ...prev, sujet: e.target.value } : null)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition"
              />
            </div>

            {/* Corps */}
            <div>
              <label className="text-xs text-white/40 tracking-widest mb-2 block">CORPS</label>
              <textarea
                value={email.corps}
                onChange={e => setEmail(prev => prev ? { ...prev, corps: e.target.value } : null)}
                rows={14}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button onClick={generer}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                ↺ Regénérer
              </button>
              <button onClick={copier}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {copied ? '✓ Copié !' : '⎘ Copier'}
              </button>
              <button
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-black transition hover:opacity-80"
                style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)' }}>
                ✉ Envoyer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}