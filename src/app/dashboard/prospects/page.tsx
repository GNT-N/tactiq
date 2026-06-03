'use client'

import { apiFetch } from '@/lib/api'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STATUTS = ['tous', 'nouveau', 'contacte', 'en_attente', 'converti', 'perdu']

const statutConfig: Record<string, { label: string, color: string }> = {
  nouveau:     { label: 'Nouveau',     color: '#64748b' },
  contacte:    { label: 'Contacté',    color: '#3b82f6' },
  en_attente:  { label: 'En attente',  color: '#f59e0b' },
  converti:    { label: 'Converti',    color: '#22c55e' },
  perdu:       { label: 'Perdu',       color: '#ef4444' },
}

const scoreColor = (score: number) => {
  if (score >= 8) return '#ef4444'
  if (score >= 5) return '#f97316'
  if (score >= 3) return '#f59e0b'
  return '#64748b'
}

export default function ProspectsPage() {
  const router = useRouter()
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [prospects, setProspects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/prospects')
      .then(res => res.json())
      .then(data => {
        setProspects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const updateStatut = async (id: string, statut: string) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, statut } : p))
    await apiFetch(`/api/prospects/detail/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statut })
    })
  }

  const filtres = prospects.filter(p => {
    const matchStatut = filtreStatut === 'tous' || p.statut === filtreStatut
    const matchRecherche = p.nom_entreprise?.toLowerCase().includes(recherche.toLowerCase()) ||
      p.ville?.toLowerCase().includes(recherche.toLowerCase()) ||
      p.secteur_activite?.toLowerCase().includes(recherche.toLowerCase())
    return matchStatut && matchRecherche
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Prospects</h2>
          <p className="text-white/40 text-sm mt-1">
            {loading ? 'Chargement...' : `${filtres.length} prospect${filtres.length > 1 ? 's' : ''} trouvé${filtres.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/prospects/nouveau')}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition-all hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)' }}>
          + Nouveau prospect
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Rechercher un prospect..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-cyan-500/50 transition"
        />
        <div className="flex gap-2 flex-wrap">
          {STATUTS.map(s => (
            <button key={s} onClick={() => setFiltreStatut(s)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize"
              style={{
                backgroundColor: filtreStatut === s ? `${statutConfig[s]?.color || '#00f5ff'}30` : 'rgba(255,255,255,0.05)',
                color: filtreStatut === s ? (statutConfig[s]?.color || '#00f5ff') : 'rgba(255,255,255,0.4)',
                border: `1px solid ${filtreStatut === s ? (statutConfig[s]?.color || '#00f5ff') + '60' : 'rgba(255,255,255,0.08)'}`,
              }}>
              {s === 'tous' ? 'Tous' : statutConfig[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}>

        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold tracking-widest"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="col-span-3">ENTREPRISE</div>
          <div className="col-span-2">SECTEUR</div>
          <div className="col-span-2">VILLE</div>
          <div className="col-span-2">CAMPAGNE</div>
          <div className="col-span-1">SCORE</div>
          <div className="col-span-2">STATUT</div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/30 text-sm">Chargement...</div>
        ) : filtres.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-4xl">◎</p>
            <p className="text-white/30 text-sm">Aucun prospect trouvé</p>
            <button
              onClick={() => router.push('/dashboard/prospects/nouveau')}
              className="text-cyan-400 text-sm hover:text-cyan-300 transition">
              + Ajouter votre premier prospect
            </button>
          </div>
        ) : (
          filtres.map((p, i) => (
            <div key={p.id}
              className="grid grid-cols-12 gap-4 px-5 py-4 cursor-pointer transition-all duration-200 group"
              style={{
                backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,245,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent')}
              onClick={() => router.push(`/dashboard/prospects/${p.id}`)}>

              <div className="col-span-3 flex items-center">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0"
                  style={{ backgroundColor: `${scoreColor(p.score)}20`, color: scoreColor(p.score) }}>
                  {p.nom_entreprise?.charAt(0)}
                </div>
                <span className="text-white text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">
                  {p.nom_entreprise}
                </span>
              </div>

              <div className="col-span-2 flex items-center text-sm text-white/50">{p.secteur_activite || '—'}</div>
              <div className="col-span-2 flex items-center text-sm text-white/50">{p.ville || '—'}</div>
              <div className="col-span-2 flex items-center text-xs text-white/40 truncate">{p.campagne?.nom || '—'}</div>

              <div className="col-span-1 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: scoreColor(p.score), boxShadow: `0 0 6px ${scoreColor(p.score)}` }} />
                <span className="text-sm font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</span>
              </div>

              <div className="col-span-2 flex items-center" onClick={e => e.stopPropagation()}>
                <select
                  value={p.statut}
                  onChange={e => updateStatut(p.id, e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg border-0 outline-none cursor-pointer w-full"
                  style={{
                    backgroundColor: `${statutConfig[p.statut]?.color}25`,
                    color: statutConfig[p.statut]?.color,
                  }}>
                  {Object.entries(statutConfig).map(([val, cfg]) => (
                    <option key={val} value={val} style={{ backgroundColor: '#0a0f1e', color: 'white' }}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}