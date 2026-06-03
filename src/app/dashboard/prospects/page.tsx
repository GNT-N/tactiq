'use client'

import { useState } from 'react'
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

const mockProspects = [
  { id: '1', nom_entreprise: 'Menuiserie Fabre', secteur_activite: 'Artisan', ville: 'Grenoble', statut: 'contacte', score: 9, campagne: 'Artisans Grenoble', date: '2024-05-28' },
  { id: '2', nom_entreprise: 'Resto Le Bouchon', secteur_activite: 'Restaurant', ville: 'Lyon', statut: 'en_attente', score: 7, campagne: 'Restaurants Lyon', date: '2024-05-25' },
  { id: '3', nom_entreprise: 'Coiffure Élégance', secteur_activite: 'Coiffeur', ville: 'Saint-Étienne', statut: 'nouveau', score: 6, campagne: 'Coiffeurs St-Étienne', date: '2024-05-30' },
  { id: '4', nom_entreprise: 'Plomberie Martin', secteur_activite: 'Artisan', ville: 'Lyon', statut: 'nouveau', score: 8, campagne: 'Artisans Lyon', date: '2024-05-29' },
  { id: '5', nom_entreprise: 'Boulangerie Dupont', secteur_activite: 'Commerce', ville: 'Grenoble', statut: 'converti', score: 9, campagne: 'Artisans Grenoble', date: '2024-05-10' },
  { id: '6', nom_entreprise: 'Auto École Central', secteur_activite: 'Formation', ville: 'Lyon', statut: 'perdu', score: 3, campagne: 'Restaurants Lyon', date: '2024-05-15' },
  { id: '7', nom_entreprise: 'Cabinet Dentaire Blanc', secteur_activite: 'Santé', ville: 'Lyon', statut: 'nouveau', score: 5, campagne: 'Restaurants Lyon', date: '2024-06-01' },
  { id: '8', nom_entreprise: 'Garage Renault Central', secteur_activite: 'Automobile', ville: 'Saint-Étienne', statut: 'contacte', score: 6, campagne: 'Coiffeurs St-Étienne', date: '2024-05-27' },
]

export default function ProspectsPage() {
  const router = useRouter()
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [recherche, setRecherche] = useState('')
  const [prospects, setProspects] = useState(mockProspects)

  const filtres = prospects.filter(p => {
    const matchStatut = filtreStatut === 'tous' || p.statut === filtreStatut
    const matchRecherche = p.nom_entreprise.toLowerCase().includes(recherche.toLowerCase()) ||
      p.ville.toLowerCase().includes(recherche.toLowerCase()) ||
      p.secteur_activite.toLowerCase().includes(recherche.toLowerCase())
    return matchStatut && matchRecherche
  })

  const updateStatut = (id: string, statut: string) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, statut } : p))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Prospects</h2>
          <p className="text-white/40 text-sm mt-1">{filtres.length} prospect{filtres.length > 1 ? 's' : ''} trouvé{filtres.length > 1 ? 's' : ''}</p>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition-all hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)' }}>
          + Nouveau prospect
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Recherche */}
        <input
          type="text"
          placeholder="Rechercher un prospect..."
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:border-cyan-500/50 transition"
        />

        {/* Filtre statut */}
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

        {/* Header tableau */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold tracking-widest"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="col-span-3">ENTREPRISE</div>
          <div className="col-span-2">SECTEUR</div>
          <div className="col-span-2">VILLE</div>
          <div className="col-span-2">CAMPAGNE</div>
          <div className="col-span-1">SCORE</div>
          <div className="col-span-2">STATUT</div>
        </div>

        {/* Lignes */}
        {filtres.length === 0 ? (
          <div className="text-center py-12 text-white/30 text-sm">
            Aucun prospect trouvé
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

              {/* Entreprise */}
              <div className="col-span-3 flex items-center">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0"
                  style={{ backgroundColor: `${scoreColor(p.score)}20`, color: scoreColor(p.score) }}>
                  {p.nom_entreprise.charAt(0)}
                </div>
                <span className="text-white text-sm font-medium truncate group-hover:text-cyan-400 transition-colors">
                  {p.nom_entreprise}
                </span>
              </div>

              {/* Secteur */}
              <div className="col-span-2 flex items-center text-sm text-white/50">
                {p.secteur_activite}
              </div>

              {/* Ville */}
              <div className="col-span-2 flex items-center text-sm text-white/50">
                {p.ville}
              </div>

              {/* Campagne */}
              <div className="col-span-2 flex items-center text-xs text-white/40 truncate">
                {p.campagne}
              </div>

              {/* Score */}
              <div className="col-span-1 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: scoreColor(p.score), boxShadow: `0 0 6px ${scoreColor(p.score)}` }} />
                <span className="text-sm font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</span>
              </div>

              {/* Statut dropdown */}
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