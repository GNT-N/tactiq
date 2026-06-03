'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const mockProspects: Record<string, any> = {
  '1': {
    id: '1',
    nom_entreprise: 'Menuiserie Fabre',
    secteur_activite: 'Artisan',
    ville: 'Grenoble',
    adresse: '12 rue des Artisans, 38000 Grenoble',
    telephone: '04 76 12 34 56',
    email_contact: 'contact@menuiserie-fabre.fr',
    site_web: 'http://menuiserie-fabre.fr',
    nom_dirigeant: 'Pierre Fabre',
    siret: '123 456 789 00012',
    score: 9,
    statut: 'contacte',
    valeur_estimee: 3500,
    campagne: 'Artisans Grenoble',
    notes: 'Site web très ancien, pas de HTTPS, pas responsive. Très bonne note Google (4.8/5). Dirigeant réceptif au téléphone.',
    prochaine_action: 'Envoyer la proposition de refonte',
    prochaine_action_date: '2024-06-05',
    resume_ia: 'Entreprise artisanale active avec une forte réputation locale (4.8★ sur 127 avis) mais une présence web obsolète. Site datant de 2014, non sécurisé (HTTP), non responsive. Fort potentiel de conversion — le dirigeant est conscient du problème.',
    analyse_json: {
      site_existant: true,
      https: false,
      responsive: false,
      annee_creation_site: 2014,
      note_google: 4.8,
      nombre_avis: 127,
      reseaux_sociaux: ['Facebook'],
      signaux_besoin: ['Site obsolète', 'Non HTTPS', 'Non responsive', 'Pas de SEO local'],
    },
    interactions: [
      { id: '1', type: 'note', contenu: 'Prospect identifié via Google Maps', created_at: '2024-05-20' },
      { id: '2', type: 'email_envoye', contenu: 'Email de prise de contact envoyé', created_at: '2024-05-22' },
      { id: '3', type: 'appel', contenu: 'Appel téléphonique — Pierre Fabre intéressé, demande un devis', created_at: '2024-05-28' },
      { id: '4', type: 'statut_change', contenu: 'Statut changé : Nouveau → Contacté', statut_avant: 'nouveau', statut_apres: 'contacte', created_at: '2024-05-28' },
    ],
  },
}

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
  email_envoye:   '◇',
  appel:          '◎',
  note:           '◈',
  statut_change:  '⬡',
  relance:        '↺',
}

export default function ProspectDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const prospect = mockProspects[id as string]

  if (!prospect) return (
    <div className="text-center py-20 text-white/40">
      <p className="text-4xl mb-4">◎</p>
      <p>Prospect introuvable</p>
      <Link href="/dashboard/prospects" className="text-cyan-400 text-sm mt-2 inline-block">← Retour aux prospects</Link>
    </div>
  )

  const s = statutConfig[prospect.statut]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white/40 hover:text-white transition text-sm">← Retour</button>
          <div>
            <h2 className="text-2xl font-bold text-white">{prospect.nom_entreprise}</h2>
            <p className="text-white/40 text-sm">{prospect.secteur_activite} · {prospect.ville} · {prospect.campagne}</p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex gap-2">
          <button className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition hover:opacity-80"
            style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)' }}>
            ✉ Générer un email
          </button>
          <button className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            ✎ Modifier
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne gauche */}
        <div className="space-y-4">

          {/* Infos principales */}
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-xs font-semibold tracking-widest text-white/40">INFORMATIONS</h3>

            {/* Score + Statut */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: scoreColor(prospect.score), boxShadow: `0 0 8px ${scoreColor(prospect.score)}` }} />
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
                  <a href={`tel:${prospect.telephone}`} className="text-cyan-400 hover:text-cyan-300">{prospect.telephone}</a>
                </div>
              )}
              {prospect.email_contact && (
                <div className="flex justify-between">
                  <span className="text-white/40">Email</span>
                  <a href={`mailto:${prospect.email_contact}`} className="text-cyan-400 hover:text-cyan-300 truncate max-w-32">{prospect.email_contact}</a>
                </div>
              )}
              {prospect.site_web && (
                <div className="flex justify-between">
                  <span className="text-white/40">Site web</span>
                  <a href={prospect.site_web} target="_blank" className="text-cyan-400 hover:text-cyan-300 truncate max-w-32">{prospect.site_web}</a>
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

          {/* Analyse IA */}
          <div className="rounded-xl p-5 space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-xs font-semibold tracking-widest text-white/40">ANALYSE IA</h3>
            <p className="text-sm text-white/70 leading-relaxed">{prospect.resume_ia}</p>

            <div className="space-y-2 pt-2">
              {prospect.analyse_json.signaux_besoin.map((signal: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-red-400">⚠</span>
                  <span className="text-white/60">{signal}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-lg font-bold text-yellow-400">★ {prospect.analyse_json.note_google}</div>
                <div className="text-xs text-white/40">{prospect.analyse_json.nombre_avis} avis</div>
              </div>
              <div className="text-center p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-lg font-bold" style={{ color: prospect.analyse_json.https ? '#22c55e' : '#ef4444' }}>
                  {prospect.analyse_json.https ? '✓' : '✗'} HTTPS
                </div>
                <div className="text-xs text-white/40">{prospect.analyse_json.responsive ? 'Responsive' : 'Non responsive'}</div>
              </div>
            </div>
          </div>

          {/* Prochaine action */}
          {prospect.prochaine_action && (
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.15)' }}>
              <h3 className="text-xs font-semibold tracking-widest text-cyan-400/60 mb-2">PROCHAINE ACTION</h3>
              <p className="text-sm text-white">{prospect.prochaine_action}</p>
              <p className="text-xs text-cyan-400/60 mt-1">{prospect.prochaine_action_date}</p>
            </div>
          )}
        </div>

        {/* Colonne droite — Timeline + Notes */}
        <div className="lg:col-span-2 space-y-4">

          {/* Notes */}
          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-xs font-semibold tracking-widest text-white/40 mb-3">NOTES</h3>
            <textarea
              defaultValue={prospect.notes}
              rows={3}
              className="w-full bg-transparent text-sm text-white/70 resize-none focus:outline-none placeholder-white/20"
              placeholder="Ajouter une note..."
            />
          </div>

          {/* Timeline */}
          <div className="rounded-xl p-5"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-xs font-semibold tracking-widest text-white/40 mb-4">HISTORIQUE</h3>

            <div className="space-y-4">
              {[...prospect.interactions].reverse().map((interaction: any, i: number) => (
                <div key={interaction.id} className="flex gap-3">
                  {/* Icône + ligne */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: 'rgba(0,245,255,0.1)', color: '#00f5ff' }}>
                      {interactionIcon[interaction.type] || '◎'}
                    </div>
                    {i < prospect.interactions.length - 1 && (
                      <div className="w-px flex-1 mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="pb-4 flex-1">
                    <p className="text-sm text-white/80">{interaction.contenu}</p>
                    {interaction.statut_avant && (
                      <p className="text-xs text-white/30 mt-1">
                        {statutConfig[interaction.statut_avant]?.label} → {statutConfig[interaction.statut_apres]?.label}
                      </p>
                    )}
                    <p className="text-xs text-white/30 mt-1">{interaction.created_at}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Ajouter une interaction */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ajouter une note ou interaction..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition"
                />
                <button className="px-4 py-2 rounded-lg text-sm font-semibold text-black"
                  style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)' }}>
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