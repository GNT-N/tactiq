'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import EmailGeneratorModal from '@/components/EmailGeneratorModal'
import type { Signal } from '@/lib/analyse-site'

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

const interactionIcon: Record<string, string> = {
  email_envoye:  '◇',
  appel:         '◎',
  note:          '◈',
  statut_change: '⬡',
  relance:       '↺',
  analyse_ia:    '⚡',
}



export default function ProspectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [prospect, setProspect] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [note, setNote] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [analyseErreur, setAnalyseErreur] = useState('')
  const [enrichissement, setEnrichissement] = useState({ encours: false, message: '', erreur: '' })

  const chargerProspect = () =>
    apiFetch(`/api/prospects/detail/${id}`)
      .then(res => {
        if (res.status === 404) { setNotFound(true); setLoading(false); return null }
        return res.json()
      })
      .then(data => {
        if (data) setProspect(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

  useEffect(() => {
    chargerProspect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const supprimerProspect = async () => {
  setDeleting(true)
  await apiFetch(`/api/prospects/detail/${id}`, { method: 'DELETE' })
  router.push('/prospects')
}

  const enrichir = () => {
    setEnrichissement({ encours: true, message: '', erreur: '' })

    apiFetch(`/api/prospects/detail/${id}/enrichir`, { method: 'POST' })
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error || 'enrichissement')
        return chargerProspect().then(() => {
          setEnrichissement({
            encours: false,
            message: data.trouve
              ? `${data.actif ? 'Entreprise active' : 'ENTREPRISE CESSÉE'} · confiance ${data.confiance}`
              : 'Aucune entreprise correspondante au registre',
            erreur: '',
          })
        })
      })
      .catch(e => setEnrichissement({
        encours: false,
        message: '',
        erreur: e instanceof Error ? e.message : "L'enrichissement a échoué",
      }))
  }

  const analyser = () => {
    setAnalysing(true)
    setAnalyseErreur('')

    apiFetch(`/api/prospects/detail/${id}/analyser`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('analyse')
        return chargerProspect()
      })
      .catch(() => setAnalyseErreur("L'analyse a échoué"))
      .finally(() => setAnalysing(false))
  }

  const ajouterNote = async () => {
    if (!note.trim()) return
    await apiFetch('/api/interactions', {
      method: 'POST',
      body: JSON.stringify({
        prospect_id: id,
        type: 'note',
        contenu: note,
      })
    })
    setNote('')
    chargerProspect()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-white/40">Chargement...</p>
    </div>
  )

  if (notFound || !prospect) return (
    <div className="text-center py-20 text-white/40">
      <p className="text-4xl mb-4">◎</p>
      <p>Prospect introuvable</p>
      <Link href="/prospects" className="text-[var(--theme-primary)] text-sm mt-2 inline-block">← Retour aux prospects</Link>
    </div>
  )

  const s = statutConfig[prospect.statut] || statutConfig['nouveau']

  return (
    <div className="space-y-6">

      {/* Modale email */}
      {showEmailModal && (
        <EmailGeneratorModal
          prospect={prospect}
          onClose={() => setShowEmailModal(false)}
          onSaved={chargerProspect}
        />
      )}

      {/* Modale confirmation suppression */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--theme-card)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <h3 className="text-lg font-bold text-white">Supprimer ce prospect ?</h3>
            <p className="text-white/60 text-sm">
              Cette action est irréversible. Toutes les interactions et emails liés seront aussi supprimés.
            </p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition"
                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                Annuler
              </button>
              <button onClick={supprimerProspect} disabled={deleting}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: '#ef4444' }}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(enrichissement.message || enrichissement.erreur) && (
        <p className="text-sm rounded-lg px-4 py-3"
          style={enrichissement.erreur
            ? { color: '#f87171', background: 'rgba(127,29,29,0.4)', border: '1px solid rgba(153,27,27,0.5)' }
            : { color: 'var(--theme-primary)', background: 'var(--theme-primary-10)', border: '1px solid var(--theme-primary-30)' }}>
          {enrichissement.erreur || enrichissement.message}
        </p>
      )}

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition">
            ← Retour
          </button>
          <div className="flex gap-2">
            <button
              onClick={analyser}
              disabled={analysing}
              className="px-3 py-2 rounded-lg text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--theme-primary-30)', color: 'var(--theme-primary)' }}>
              {analysing ? 'Analyse...' : '⚡ Analyser le site'}
            </button>
            <button
              onClick={enrichir}
              disabled={enrichissement.encours}
              title="Rapproche du registre national : SIRET, dirigeant, entreprise encore active"
              className="px-3 py-2 rounded-lg text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
              style={{ border: '1px solid var(--theme-primary-30)', color: 'var(--theme-primary)' }}>
              {enrichissement.encours ? 'Recherche...' : '⚑ Enrichir'}
            </button>
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-3 py-2 rounded-lg text-xs font-semibold text-black transition hover:opacity-80"
              style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}>
              ✉ Email IA
            </button>
            <button
              onClick={() => router.push(`/prospects/${id}/modifier`)}
              className="px-3 py-2 rounded-lg text-xs text-white/60 hover:text-white transition"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              ✎ Modifier
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 transition"
              style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
              🗑 Supprimer
            </button>
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{prospect.nom_entreprise}</h2>
          <p className="text-white/40 text-sm">
            {[prospect.secteur_activite, prospect.ville, prospect.campagne?.nom].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne gauche */}
        <div className="space-y-4">
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-xs font-semibold tracking-widest text-white/40">INFORMATIONS</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: scoreColor(prospect.score), boxShadow: `0 0 8px ${scoreColor(prospect.score)}` }} />
                <span className="text-2xl font-black" style={{ color: scoreColor(prospect.score) }}>{prospect.score}/10</span>
              </div>
              <span className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ backgroundColor: `${s.color}25`, color: s.color }}>
                {s.label}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              {prospect.nom_dirigeant && (
                <div className="flex justify-between">
                  <span className="text-white/40">Dirigeant</span>
                  <span className="text-white">{prospect.nom_dirigeant}</span>
                </div>
              )}
              {prospect.telephone && (
                <div className="flex justify-between">
                  <span className="text-white/40">Téléphone</span>
                  <a href={`tel:${prospect.telephone}`} className="text-[var(--theme-primary)] hover:opacity-80">{prospect.telephone}</a>
                </div>
              )}
              {prospect.email_contact && (
                <div className="flex justify-between">
                  <span className="text-white/40">Email</span>
                  <a href={`mailto:${prospect.email_contact}`} className="text-[var(--theme-primary)] hover:opacity-80 truncate max-w-32">{prospect.email_contact}</a>
                </div>
              )}
              {prospect.site_web && (
                <div className="flex justify-between">
                  <span className="text-white/40">Site web</span>
                  <a href={prospect.site_web} target="_blank" className="text-[var(--theme-primary)] hover:opacity-80 truncate max-w-32">{prospect.site_web}</a>
                </div>
              )}
              {prospect.adresse && (
                <div className="flex justify-between">
                  <span className="text-white/40">Adresse</span>
                  <span className="text-white/60 text-xs text-right max-w-40">{prospect.adresse}</span>
                </div>
              )}
              {prospect.siret && (
                <div className="flex justify-between">
                  <span className="text-white/40">SIRET</span>
                  <span className="text-white/60 text-xs">{prospect.siret}</span>
                </div>
              )}
              {prospect.valeur_estimee && (
                <div className="flex justify-between">
                  <span className="text-white/40">Valeur estimée</span>
                  <span className="text-green-400 font-bold">{prospect.valeur_estimee.toLocaleString()}€</span>
                </div>
              )}
            </div>
          </div>

          {prospect.resume_ia && (
            <div className="rounded-xl p-5 space-y-3"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="text-xs font-semibold tracking-widest text-white/40">ANALYSE IA</h3>
              <p className="text-sm text-white/70 leading-relaxed">{prospect.resume_ia}</p>
            </div>
          )}

          {prospect.prochaine_action && (
            <div className="rounded-xl p-4"
              style={{ background: 'var(--theme-primary-05)', border: '1px solid var(--theme-primary-15)' }}>
              <h3 className="text-xs font-semibold tracking-widest text-[var(--theme-primary-60)] mb-2">PROCHAINE ACTION</h3>
              <p className="text-sm text-white">{prospect.prochaine_action}</p>
              {prospect.prochaine_action_date && (
                <p className="text-xs text-[var(--theme-primary-60)] mt-1">
                  {new Date(prospect.prochaine_action_date).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="lg:col-span-2 space-y-4">

          {/* Analyse du site */}
          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold tracking-widest text-white/40">ANALYSE DU SITE</h3>
              {prospect.analyse_json?.analyse_le && (
                <span className="text-xs text-white/25">
                  {new Date(prospect.analyse_json.analyse_le).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>

            {analyseErreur && (
              <p className="text-red-400 text-sm mb-3">{analyseErreur}</p>
            )}

            {!prospect.analyse_json ? (
              <p className="text-white/20 text-sm">
                Pas encore analysé — lance « Analyser le site » pour calculer le score.
              </p>
            ) : (
              <div className="space-y-4">
                {prospect.resume_ia && (
                  <p className="text-sm text-white/70">{prospect.resume_ia}</p>
                )}

                {prospect.analyse_json.url && (
                  <p className="text-xs text-white/30 break-all">
                    {prospect.analyse_json.url}
                    {prospect.analyse_json.temps_reponse_ms != null &&
                      ` · ${(prospect.analyse_json.temps_reponse_ms / 1000).toFixed(1)} s`}
                  </p>
                )}

                {prospect.analyse_json.signaux?.length > 0 ? (
                  <div className="space-y-2">
                    {prospect.analyse_json.signaux.map((signal: Signal) => (
                      <div key={signal.code} className="flex items-start gap-2 text-sm">
                        <span style={{ color: signal.poids < 0 ? '#64748b' : scoreColor(Math.min(10, signal.poids * 1.5)) }}>{signal.poids < 0 ? '▼' : '▲'}</span>
                        <span className="text-white/70 flex-1">{signal.label}</span>
                        <span className="text-white/25 text-xs">{signal.poids > 0 ? '+' : ''}{signal.poids}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm">
                    Aucun signal de besoin détecté : le site tient la route.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-xs font-semibold tracking-widest text-white/40 mb-3">NOTES</h3>
            <p className="text-sm text-white/70 whitespace-pre-wrap">
              {prospect.notes || <span className="text-white/20">Aucune note</span>}
            </p>
          </div>

          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-xs font-semibold tracking-widest text-white/40 mb-4">HISTORIQUE</h3>

            {prospect.interactions?.length === 0 ? (
              <p className="text-white/20 text-sm">Aucune interaction pour l'instant</p>
            ) : (
              <div className="space-y-4">
                {prospect.interactions?.map((interaction: any, i: number) => (
                  <div key={interaction.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                        style={{ backgroundColor: 'var(--theme-primary-10)', color: 'var(--theme-primary)' }}>
                        {interactionIcon[interaction.type] || '◎'}
                      </div>
                      {i < prospect.interactions.length - 1 && (
                        <div className="w-px flex-1 mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <p className="text-sm text-white/80">{interaction.contenu}</p>
                      {interaction.statut_avant && (
                        <p className="text-xs text-white/30 mt-1">
                          {statutConfig[interaction.statut_avant]?.label} → {statutConfig[interaction.statut_apres]?.label}
                        </p>
                      )}
                      <p className="text-xs text-white/30 mt-1">
                        {new Date(interaction.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && ajouterNote()}
                  placeholder="Ajouter une note ou interaction..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[var(--theme-primary-50)] transition"
                />
                <button onClick={ajouterNote}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-black"
                  style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}>
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}