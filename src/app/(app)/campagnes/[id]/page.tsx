'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import Link from 'next/link'
import { CATEGORIES } from '@/lib/overpass'

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [analyse, setAnalyse] = useState<{ encours: boolean, traites: number, restants: number, erreur: string }>(
    { encours: false, traites: 0, restants: 0, erreur: '' }
  )
  const [enrich, setEnrich] = useState({ encours: false, traites: 0, apparies: 0, restants: 0, erreur: '' })
  const [csv, setCsv] = useState({ encours: false, message: '', erreur: '' })
  const [sourcing, setSourcing] = useState({
    ville: '',
    categorie: Object.keys(CATEGORIES)[0],
    limite: 50,
    encours: false,
    message: '',
    erreur: '',
  })

  const supprimerCampagne = async () => {
    setDeleting(true)
    await apiFetch(`/api/campagnes/${id}`, { method: 'DELETE' })
    router.push('/campagnes')
  }

  const chargerCampagne = () =>
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

  useEffect(() => {
    chargerCampagne()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const importer = async () => {
    if (!sourcing.ville.trim() || sourcing.encours) return
    setSourcing(s => ({ ...s, encours: true, message: '', erreur: '' }))

    try {
      const res = await apiFetch('/api/prospects/importer', {
        method: 'POST',
        body: JSON.stringify({
          campagne_id: id,
          ville: sourcing.ville.trim(),
          categorie: sourcing.categorie,
          limite: sourcing.limite,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'import')

      const details = [
        `${data.importes} prospect${data.importes > 1 ? 's' : ''} importé${data.importes > 1 ? 's' : ''}`,
        data.doublons > 0 ? `${data.doublons} déjà connu${data.doublons > 1 ? 's' : ''}` : null,
        data.limite_atteinte ? `limite atteinte sur ${data.trouves} trouvés` : null,
      ].filter(Boolean).join(' · ')

      setSourcing(s => ({ ...s, encours: false, message: details }))
      await chargerCampagne()
    } catch (e) {
      setSourcing(s => ({
        ...s,
        encours: false,
        erreur: e instanceof Error ? e.message : "L'import a échoué",
      }))
    }
  }

  const importerCsv = async (fichier: File) => {
    setCsv({ encours: true, message: '', erreur: '' })

    try {
      const contenu = await fichier.text()
      const res = await apiFetch('/api/prospects/importer-csv', {
        method: 'POST',
        body: JSON.stringify({ campagne_id: id, contenu })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'import')

      const details = [
        `${data.importes} importé${data.importes > 1 ? 's' : ''}`,
        data.doublons > 0 ? `${data.doublons} déjà connu${data.doublons > 1 ? 's' : ''}` : null,
        data.ignorees > 0 ? `${data.ignorees} ligne${data.ignorees > 1 ? 's' : ''} sans nom` : null,
        `colonnes lues : ${data.colonnes_reconnues.join(', ')}`,
      ].filter(Boolean).join(' · ')

      setCsv({ encours: false, message: details, erreur: '' })
      await chargerCampagne()
    } catch (e) {
      setCsv({
        encours: false,
        message: '',
        erreur: e instanceof Error ? e.message : "L'import du fichier a échoué",
      })
    }
  }

  const enrichirLot = async () => {
    setEnrich({ encours: true, traites: 0, apparies: 0, restants: 0, erreur: '' })
    let cumul = 0
    let trouves = 0

    try {
      for (;;) {
        const res = await apiFetch('/api/prospects/enrichir-lot', {
          method: 'POST',
          body: JSON.stringify({ campagne_id: id })
        })
        if (!res.ok) throw new Error('lot')

        const data = await res.json()
        cumul += data.traites
        trouves += data.apparies
        setEnrich({ encours: true, traites: cumul, apparies: trouves, restants: data.restants, erreur: '' })

        if (data.restants === 0 || data.traites === 0) break
      }

      await chargerCampagne()
      setEnrich(prev => ({ ...prev, encours: false }))
    } catch {
      setEnrich(prev => ({ ...prev, encours: false, erreur: "L'enrichissement en lot a échoué" }))
    }
  }

  // Le serveur ne traite qu'un lot borné par appel : on rappelle jusqu'à
  // épuisement, en s'arrêtant si un tour n'avance plus.
  const analyserLot = async () => {
    setAnalyse({ encours: true, traites: 0, restants: 0, erreur: '' })
    let cumul = 0

    try {
      for (;;) {
        const res = await apiFetch('/api/prospects/analyser-lot', {
          method: 'POST',
          body: JSON.stringify({ campagne_id: id })
        })
        if (!res.ok) throw new Error('lot')

        const data = await res.json()
        cumul += data.traites
        setAnalyse({ encours: true, traites: cumul, restants: data.restants, erreur: '' })

        if (data.restants === 0 || data.traites === 0) break
      }

      await chargerCampagne()
      setAnalyse(prev => ({ ...prev, encours: false }))
    } catch {
      setAnalyse(prev => ({ ...prev, encours: false, erreur: "L'analyse en lot a échoué" }))
    }
  }

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
      <Link href="/campagnes" className="text-[var(--theme-primary)] text-sm mt-2 inline-block">← Retour aux campagnes</Link>
    </div>
  )

  const s = campagneStatutConfig[campagne.statut] || campagneStatutConfig.active

  return (
    <div className="space-y-6">

      {/* Modale confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--theme-card)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <h3 className="text-lg font-bold text-white">Supprimer cette campagne ?</h3>
            <p className="text-white/60 text-sm">
              Les prospects de cette campagne ne seront pas supprimés, ils seront simplement détachés.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Annuler
              </button>
              <button onClick={supprimerCampagne} disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: '#ef4444' }}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(analyse.erreur || enrich.erreur) && (
        <p className="text-red-400 text-sm bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3">
          {analyse.erreur || enrich.erreur}
        </p>
      )}

      {!enrich.encours && enrich.traites > 0 && !enrich.erreur && (
        <p className="text-sm rounded-lg px-4 py-3"
          style={{ color: 'var(--theme-primary)', background: 'var(--theme-primary-10)', border: '1px solid var(--theme-primary-30)' }}>
          Enrichissement terminé : {enrich.apparies} appariés sur {enrich.traites} traités
          {enrich.traites > enrich.apparies && ` · ${enrich.traites - enrich.apparies} sans correspondance au registre`}
        </p>
      )}

      {/* Sourcing OpenStreetMap */}
      <div className="rounded-xl p-5 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          <h3 className="text-xs font-semibold tracking-widest text-white/40">SOURCING</h3>
          <p className="text-white/30 text-xs mt-1">
            Cherche dans OpenStreetMap les établissements d&apos;une commune qui n&apos;ont aucun site web.
          </p>
        </div>

        <div className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-xs text-white/40 mb-1.5 block">Commune</label>
            <input
              value={sourcing.ville}
              onChange={e => setSourcing(s => ({ ...s, ville: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && importer()}
              placeholder="Lyon"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[var(--theme-primary-50)] transition"
            />
          </div>

          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-white/40 mb-1.5 block">Activité</label>
            <select
              value={sourcing.categorie}
              onChange={e => setSourcing(s => ({ ...s, categorie: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--theme-primary-50)] transition">
              {Object.keys(CATEGORIES).map(c => (
                <option key={c} value={c} style={{ backgroundColor: 'var(--theme-card)' }}>{c}</option>
              ))}
            </select>
          </div>

          <div className="w-24">
            <label className="text-xs text-white/40 mb-1.5 block">Max</label>
            <input
              type="number" min={1} max={200}
              value={sourcing.limite}
              onChange={e => setSourcing(s => ({ ...s, limite: Number(e.target.value) }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--theme-primary-50)] transition"
            />
          </div>

          <button onClick={importer} disabled={sourcing.encours || !sourcing.ville.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition hover:opacity-80 disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}>
            {sourcing.encours ? 'Recherche...' : '⌕ Importer'}
          </button>
        </div>

        {sourcing.message && (
          <p className="text-sm" style={{ color: 'var(--theme-primary)' }}>{sourcing.message}</p>
        )}
        {sourcing.erreur && (
          <p className="text-red-400 text-sm">{sourcing.erreur}</p>
        )}

        <div className="pt-4 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-white/30 text-xs">
            Ou dépose un fichier CSV — les colonnes sont reconnues automatiquement
            (nom, ville, téléphone, email, site, dirigeant, SIRET…), quel que soit
            le séparateur.
          </p>

          <label className="inline-block px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition cursor-pointer"
            style={{ border: '1px solid rgba(255,255,255,0.1)', opacity: csv.encours ? 0.4 : 1 }}>
            {csv.encours ? 'Lecture...' : '↥ Importer un CSV'}
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              disabled={csv.encours}
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                e.target.value = '' // permet de réimporter le même fichier
                if (f) importerCsv(f)
              }}
            />
          </label>

          {csv.message && (
            <p className="text-sm" style={{ color: 'var(--theme-primary)' }}>{csv.message}</p>
          )}
          {csv.erreur && (
            <p className="text-red-400 text-sm">{csv.erreur}</p>
          )}
        </div>
      </div>

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
            <button
              onClick={analyserLot}
              disabled={analyse.encours}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--theme-primary-30)', color: 'var(--theme-primary)' }}>
              {analyse.encours
                ? `Analyse... ${analyse.traites} traités${analyse.restants ? `, ${analyse.restants} restants` : ''}`
                : '⚡ Analyser les prospects'}
            </button>
            <button
              onClick={enrichirLot}
              disabled={enrich.encours}
              title="Rapproche chaque prospect du registre national : SIRET, dirigeant, entreprise encore active"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--theme-primary-30)', color: 'var(--theme-primary)' }}>
              {enrich.encours
                ? `Enrichissement... ${enrich.traites} traités${enrich.restants ? `, ${enrich.restants} restants` : ''}`
                : '⚑ Enrichir les prospects'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 transition"
              style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
              🗑 Supprimer
            </button>
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
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--theme-primary-10)' }}>
            <div className="text-lg mb-1" style={{ color: 'var(--theme-primary)' }}>{stat.icon}</div>
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
            onClick={() => router.push('/prospects/nouveau')}
            className="text-xs px-3 py-1.5 rounded-lg font-medium text-black"
            style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}>
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
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-primary-04)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent')}
              onClick={() => router.push(`/prospects/${p.id}`)}>

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