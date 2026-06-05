'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'

const statutConfig: Record<string, { label: string, color: string }> = {
  nouveau:    { label: 'Nouveau',    color: '#64748b' },
  contacte:   { label: 'Contacté',  color: '#3b82f6' },
  en_attente: { label: 'En attente', color: '#f59e0b' },
  converti:   { label: 'Converti',  color: '#22c55e' },
  perdu:      { label: 'Perdu',     color: '#ef4444' },
}

const scoreColor = (score: number) => {
  if (score >= 8) return '#ef4444'
  if (score >= 5) return '#f97316'
  if (score >= 3) return '#f59e0b'
  return '#64748b'
}

const campagneStatuts = ['active', 'pause', 'terminee']
const campagneStatutConfig: Record<string, { label: string, color: string }> = {
  active:   { label: 'Active',    color: '#22c55e' },
  pause:    { label: 'En pause',  color: '#f59e0b' },
  terminee: { label: 'Terminée',  color: '#64748b' },
}

export default function CampagneDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [campagne, setCampagne] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    apiFetch(`/api/campagnes/${id}`)
      .then(res => {
        if (res.status === 404) { setNotFound(true); setLoading(false); return null }
        return res.json()
      })
      .then(data => {
        if (data) setCampagne(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const updateStatut = async (statut: string) => {
    setCampagne((prev: any) => ({ ...prev, statut }))
    await apiFetch(`/api/campagnes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ statut })
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-white/40">Chargement...</p>
    </div>
  )

  if (notFound || !campagne) return (
    <div className="text-center py-20 text-white/40">
      <p className="text-4xl mb-4">◈</p>
      <p>Campagne introuvable</p>
      <Link href="/dashboard/campagnes" className="text-cyan-400 text-sm mt-2 inline-block">← Retour aux campagnes</Link>
    </div>
  )

  const s = campagneStatutConfig[campagne.statut] || campagneStatutConfig.active

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}
            className="text-sm text-white/40 hover:text-white transition">
            ← Retour
          </button>
          <div className="flex gap-2">
            {campagneStatuts.map(st => (
              <button key={st} onClick={() => updateStatut(st)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={{
                  backgroundColor: campagne.statut === st ? `${campagneStatutConfig[st].color}25` : 'rgba(255,255,255,0.05)',
                  color: campagne.statut === st ? campagneStatutConfig[st].color : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${campagne.statut === st ? campagneStatutConfig[st].color + '50' : 'rgba(255,255,255,0.08)'}`,
                }}>
                {campagneStatutConfig[st].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{campagne.nom}</h2>
          <p className="text-white/40 text-sm mt-1">
            {campagne.description || 'Aucune description'} · Créée le {new Date(campagne.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Prospects', value: campagne.prospects?.length || 0, icon: '◎' },
          { label: 'Convertis', value: campagne.prospects?.filter((p: any) => p.statut === 'converti').length || 0, icon: '⬡' },
          { label: 'Taux conversion', value: campagne.prospects?.length > 0 ? Math.round((campagne.prospects?.filter((p: any) => p.statut === 'converti').length / campagne.prospects?.length) * 100) : 0, suffix: '%', icon: '◈' },
          { label: 'Pipeline', value: campagne.prospects?.reduce((acc: number, p: any) => acc + (p.valeur_estimee || 0), 0) || 0, suffix: '€', icon: '◇' },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl p-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,245,255,0.1)' }}>
            <div className="text-lg mb-1" style={{ color: '#00f5ff' }}>{stat.icon}</div>
            <div className="text-2xl font-black text-white">{stat.value}{stat.suffix || ''}</div>
            <div className="text-xs text-white/40 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Prospects */}
      <div className="rounded-xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-xs font-semibold tracking-widest text-white/40">
            PROSPECTS ({campagne.prospects?.length || 0})
          </h3>
          <button
            onClick={() => router.push('/dashboard/prospects/nouveau')}
            className="text-xs px-3 py-1.5 rounded-lg font-medium text-black"
            style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)' }}>
            + Ajouter
          </button>
        </div>

        {campagne.prospects?.length === 0 ? (
          <div className="text-center py-12 text-white/20 text-sm">
            Aucun prospect dans cette campagne
          </div>
        ) : (
          campagne.prospects?.map((p: any, i: number) => (
            <div key={p.id}
              className="flex items-center gap-4 px-5 py-3 cursor-pointer transition-all"
              style={{
                backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(0,245,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent')}
              onClick={() => router.push(`/dashboard/prospects/${p.id}`)}>

              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: `${scoreColor(p.score)}20`, color: scoreColor(p.score) }}>
                {p.nom_entreprise?.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.nom_entreprise}</p>
                <p className="text-white/40 text-xs">{[p.secteur_activite, p.ville].filter(Boolean).join(' · ')}</p>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: scoreColor(p.score), boxShadow: `0 0 6px ${scoreColor(p.score)}` }} />
                  <span className="text-sm font-bold" style={{ color: scoreColor(p.score) }}>{p.score}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full hidden sm:block"
                  style={{ backgroundColor: `${statutConfig[p.statut]?.color}20`, color: statutConfig[p.statut]?.color }}>
                  {statutConfig[p.statut]?.label}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}