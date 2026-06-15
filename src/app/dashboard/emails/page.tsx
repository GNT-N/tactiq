'use client'

import { apiFetch } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const STATUTS = ['tous', 'genere', 'envoye', 'ouvert', 'repondu']

const statutConfig: Record<string, { label: string, color: string }> = {
  genere:  { label: 'Généré',  color: '#64748b' },
  envoye:  { label: 'Envoyé',  color: '#3b82f6' },
  ouvert:  { label: 'Ouvert',  color: '#f59e0b' },
  repondu: { label: 'Répondu', color: '#22c55e' },
}

export default function EmailsPage() {
  const router = useRouter()
  const [emails, setEmails] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('tous')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    apiFetch('/api/emails')
      .then(res => res.json())
      .then(data => {
        setEmails(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtres = emails.filter(e => filtre === 'tous' || e.statut === filtre)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Emails</h2>
        <p className="text-white/40 text-sm mt-1">
          {loading ? 'Chargement...' : `${filtres.length} email${filtres.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {STATUTS.map(s => (
          <button key={s} onClick={() => setFiltre(s)}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: filtre === s ? `${statutConfig[s]?.color || '#00f5ff'}30` : 'rgba(255,255,255,0.05)',
              color: filtre === s ? (statutConfig[s]?.color || '#00f5ff') : 'rgba(255,255,255,0.4)',
              border: `1px solid ${filtre === s ? (statutConfig[s]?.color || '#00f5ff') + '60' : 'rgba(255,255,255,0.08)'}`,
            }}>
            {s === 'tous' ? 'Tous' : statutConfig[s]?.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-12 text-white/30 text-sm">Chargement...</div>
      ) : filtres.length === 0 ? (
        <div className="text-center py-16 space-y-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
          <p className="text-4xl">◇</p>
          <p className="text-white/30 text-sm">Aucun email généré</p>
          <p className="text-white/20 text-xs">Générez des emails depuis les fiches prospects</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          {filtres.map((email, i) => (
            <div key={email.id}
              className="flex items-center gap-4 px-5 py-4 cursor-pointer transition-all"
              style={{
                backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,245,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent')}
              onClick={() => setSelected(email)}>

              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: 'rgba(0,245,255,0.1)', color: '#00f5ff' }}>
                ◇
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{email.sujet}</p>
                <p className="text-white/40 text-xs">
                  {email.prospect?.nom_entreprise || 'Prospect supprimé'} · {new Date(email.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <span className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                style={{ backgroundColor: `${statutConfig[email.statut]?.color}20`, color: statutConfig[email.statut]?.color }}>
                {statutConfig[email.statut]?.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modale détail email */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: '#0a0f1e', border: '1px solid rgba(0,245,255,0.2)' }}
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.sujet}</h3>
                <p className="text-white/40 text-sm">
                  {selected.prospect?.nom_entreprise} · {new Date(selected.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white transition text-xl">✕</button>
            </div>

            <div className="rounded-lg p-4 text-sm text-white/70 whitespace-pre-wrap"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {selected.contenu}
            </div>

            {selected.prospect && (
              <button
                onClick={() => router.push(`/dashboard/prospects/${selected.prospect.id}`)}
                className="text-cyan-400 text-sm hover:text-cyan-300 transition">
                → Voir le prospect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}