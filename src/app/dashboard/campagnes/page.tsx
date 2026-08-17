'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

export default function CampagnesPage() {
  const router = useRouter()
  const [campagnes, setCampagnes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nom: '', description: '', secteur_id: '' })
  const [secteurs, setSecteurs] = useState<any[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch('/api/campagnes').then(r => r.json()),
      apiFetch('/api/secteurs').then(r => r.json()),
    ]).then(([camp, sect]) => {
      setCampagnes(Array.isArray(camp) ? camp : [])
      setSecteurs(Array.isArray(sect) ? sect : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleCreate = async () => {
    if (!form.nom) return
    setCreating(true)
    const res = await apiFetch('/api/campagnes', {
      method: 'POST',
      body: JSON.stringify(form)
    })
    const data = await res.json()
    setCampagnes(prev => [data, ...prev])
    setForm({ nom: '', description: '', secteur_id: '' })
    setShowForm(false)
    setCreating(false)
  }

  const statutConfig: Record<string, { label: string, color: string }> = {
    active:   { label: 'Active',   color: '#22c55e' },
    pause:    { label: 'En pause', color: '#f59e0b' },
    terminee: { label: 'Terminée', color: '#64748b' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Campagnes</h2>
          <p className="text-white/40 text-sm mt-1">{campagnes.length} campagne{campagnes.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}>
          + Nouvelle campagne
        </button>
      </div>

      {/* Formulaire création */}
      {showForm && (
        <div className="rounded-xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--theme-primary-20)' }}>
          <h3 className="text-sm font-semibold text-white/60 tracking-widest">NOUVELLE CAMPAGNE</h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Nom *</label>
              <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                placeholder="Restaurants Lyon" 
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--theme-primary-50)] transition" />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Secteur</label>
              <select value={form.secteur_id} onChange={e => setForm(p => ({ ...p, secteur_id: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--theme-primary-50)] transition">
                <option value="" style={{ backgroundColor: 'var(--theme-card)' }}>Aucun secteur</option>
                {secteurs.map(s => (
                  <option key={s.id} value={s.id} style={{ backgroundColor: 'var(--theme-card)' }}>{s.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Description</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Cibler les restaurants sans site web à Lyon..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--theme-primary-50)] transition" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              Annuler
            </button>
            <button onClick={handleCreate} disabled={creating || !form.nom}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition hover:opacity-80 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}>
              {creating ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste campagnes */}
      {loading ? (
        <div className="text-center py-12 text-white/30 text-sm">Chargement...</div>
      ) : campagnes.length === 0 ? (
        <div className="text-center py-16 space-y-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
          <p className="text-4xl">◈</p>
          <p className="text-white/30 text-sm">Aucune campagne</p>
          <button onClick={() => setShowForm(true)} className="text-[var(--theme-primary)] text-sm hover:opacity-80 transition">
            + Créer votre première campagne
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {campagnes.map(c => {
            const s = statutConfig[c.statut] || statutConfig.active
            return (
              <div key={c.id}
                className="rounded-xl p-5 space-y-4 cursor-pointer transition-all duration-200 hover:scale-[1.01]"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
                onClick={() => router.push(`/dashboard/campagnes/${c.id}`)}>

                {/* Header card */}
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: 'var(--theme-primary-10)', color: 'var(--theme-primary)' }}>
                    ◈
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ backgroundColor: `${s.color}20`, color: s.color }}>
                    {s.label}
                  </span>
                </div>

                {/* Nom + description */}
                <div>
                  <h3 className="text-white font-semibold">{c.nom}</h3>
                  {c.description && <p className="text-white/40 text-sm mt-1 truncate">{c.description}</p>}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-2"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{c._count?.prospects || 0}</div>
                    <div className="text-xs text-white/30">Prospects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-white">{c.secteur?.nom || '—'}</div>
                    <div className="text-xs text-white/30">Secteur</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-white/30">
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="text-xs text-white/30">Créée le</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}