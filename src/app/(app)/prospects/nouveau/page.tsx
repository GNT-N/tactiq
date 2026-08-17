'use client'

import { apiFetch } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function NouveauProspectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [campagnes, setCampagnes] = useState<any[]>([])
  const [form, setForm] = useState({
    nom_entreprise: '',
    secteur_activite: '',
    ville: '',
    adresse: '',
    telephone: '',
    email_contact: '',
    site_web: '',
    nom_dirigeant: '',
    siret: '',
    valeur_estimee: '',
    notes: '',
    campagne_id: '',
  })

  useEffect(() => {
    apiFetch('/api/campagnes')
      .then(res => res.json())
      .then(data => setCampagnes(Array.isArray(data) ? data : []))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    if (!form.nom_entreprise) { setError("Le nom de l'entreprise est requis"); return }
    setLoading(true)
    setError('')

    const res = await apiFetch('/api/prospects', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        valeur_estimee: form.valeur_estimee ? parseFloat(form.valeur_estimee) : null,
        campagne_id: form.campagne_id || null,
      })
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/prospects/${data.id}`)
    } else {
      setError('Erreur lors de la création')
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[var(--theme-primary-50)] transition"
  const labelClass = "text-xs text-white/40 mb-1.5 block tracking-wide"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Nouveau prospect</h2>
          <p className="text-white/40 text-sm mt-1">Remplissez les informations du prospect</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.back()}
            className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition hover:opacity-80 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}>
            {loading ? 'Création...' : 'Créer le prospect'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/50 border border-red-800/50 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Infos entreprise */}
        <div className="rounded-xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-xs font-semibold tracking-widest text-white/40">ENTREPRISE</h3>

          <div>
            <label className={labelClass}>Nom de l'entreprise *</label>
            <input name="nom_entreprise" value={form.nom_entreprise} onChange={handleChange}
              placeholder="Menuiserie Fabre" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Secteur d'activité</label>
            <input name="secteur_activite" value={form.secteur_activite} onChange={handleChange}
              placeholder="Artisan, Restaurant, Commerce..." className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Ville</label>
            <input name="ville" value={form.ville} onChange={handleChange}
              placeholder="Lyon" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Adresse</label>
            <input name="adresse" value={form.adresse} onChange={handleChange}
              placeholder="12 rue des Artisans, 38000 Grenoble" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>SIRET</label>
            <input name="siret" value={form.siret} onChange={handleChange}
              placeholder="123 456 789 00012" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Campagne</label>
            <select name="campagne_id" value={form.campagne_id} onChange={handleChange}
              className={inputClass}>
              <option value="" style={{ backgroundColor: 'var(--theme-card)' }}>Aucune campagne</option>
              {campagnes.map(c => (
                <option key={c.id} value={c.id} style={{ backgroundColor: 'var(--theme-card)' }}>{c.nom}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Infos contact */}
        <div className="rounded-xl p-6 space-y-4"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-xs font-semibold tracking-widest text-white/40">CONTACT</h3>

          <div>
            <label className={labelClass}>Nom du dirigeant</label>
            <input name="nom_dirigeant" value={form.nom_dirigeant} onChange={handleChange}
              placeholder="Pierre Fabre" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Téléphone</label>
            <input name="telephone" value={form.telephone} onChange={handleChange}
              placeholder="04 76 12 34 56" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input name="email_contact" value={form.email_contact} onChange={handleChange}
              placeholder="contact@entreprise.fr" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Site web</label>
            <input name="site_web" value={form.site_web} onChange={handleChange}
              placeholder="https://www.entreprise.fr" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Valeur estimée (€)</label>
            <input name="valeur_estimee" value={form.valeur_estimee} onChange={handleChange}
              type="number" placeholder="3500" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="rounded-xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-xs font-semibold tracking-widest text-white/40">NOTES</h3>
        <textarea name="notes" value={form.notes} onChange={handleChange}
          placeholder="Informations complémentaires, contexte, observations..."
          rows={4}
          className={inputClass + ' resize-none'} />
      </div>
    </div>
  )
}