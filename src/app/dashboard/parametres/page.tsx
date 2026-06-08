'use client'

import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

const themes = {
  cyberpunk: { nom: 'Cyberpunk', primary: '#00f5ff', secondary: '#bf00ff' },
  aurora:    { nom: 'Aurora',    primary: '#f472b6', secondary: '#a855f7' },
  fire:      { nom: 'Fire',      primary: '#f97316', secondary: '#ef4444' },
  matrix:    { nom: 'Matrix',    primary: '#22c55e', secondary: '#06b6d4' },
  gold:      { nom: 'Gold',      primary: '#f5c842', secondary: '#b8860b' },
}

export default function ParametresPage() {
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({
    nom: '',
    metier: '',
    ville: '',
    theme: 'cyberpunk',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setEmail(data.user.email || '')
    })
    apiFetch('/api/user/me')
      .then(r => r.json())
      .then(profile => {
        if (profile) {
          setForm({
            nom: profile.nom || '',
            metier: profile.metier || '',
            ville: profile.ville || '',
            theme: profile.theme || 'cyberpunk',
          })
        }
      })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    setLoading(true)
    setSaved(false)
    await apiFetch('/api/user/me', {
      method: 'PATCH',
      body: JSON.stringify(form)
    })
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-cyan-500/50 transition"
  const labelClass = "text-xs text-white/40 mb-1.5 block tracking-wide"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Paramètres</h2>
          <p className="text-white/40 text-sm mt-1">Gérez votre profil et vos préférences</p>
        </div>
        <button onClick={handleSave} disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition hover:opacity-80 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)' }}>
          {loading ? 'Enregistrement...' : saved ? '✓ Enregistré' : 'Enregistrer'}
        </button>
      </div>

      {/* Profil */}
      <div className="rounded-xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-xs font-semibold tracking-widest text-white/40">PROFIL</h3>

        {/* Avatar */}
        <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #00f5ff, #bf00ff)', color: 'black' }}>
            {form.nom ? form.nom.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white text-sm font-medium">{form.nom || 'Utilisateur'}</p>
            <p className="text-white/40 text-xs">{email}</p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Nom</label>
          <input name="nom" value={form.nom} onChange={handleChange} placeholder="Votre nom" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Métier</label>
          <input name="metier" value={form.metier} onChange={handleChange} placeholder="Développeur web freelance" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ville</label>
          <input name="ville" value={form.ville} onChange={handleChange} placeholder="Lyon" className={inputClass} />
        </div>
      </div>

      {/* Thème */}
      <div className="rounded-xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-xs font-semibold tracking-widest text-white/40">THÈME</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.entries(themes) as [string, typeof themes.cyberpunk][]).map(([key, theme]) => (
            <button key={key}
              onClick={() => setForm(prev => ({ ...prev, theme: key }))}
              className="p-4 rounded-lg transition-all"
              style={{
                background: form.theme === key ? `${theme.primary}15` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${form.theme === key ? theme.primary + '60' : 'rgba(255,255,255,0.08)'}`,
              }}>
              <div className="flex gap-1.5 mb-2 justify-center">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.secondary }} />
              </div>
              <p className="text-xs text-center" style={{ color: form.theme === key ? theme.primary : 'rgba(255,255,255,0.5)' }}>
                {theme.nom}
              </p>
            </button>
          ))}
        </div>
        <p className="text-white/30 text-xs">Le thème sélectionné sera appliqué à toute l'interface.</p>
      </div>

      {/* Compte */}
      <div className="rounded-xl p-6 space-y-4"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h3 className="text-xs font-semibold tracking-widest text-white/40">COMPTE</h3>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-white text-sm">Email</p>
            <p className="text-white/40 text-xs">{email}</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-white text-sm">Plan</p>
            <p className="text-white/40 text-xs">Gratuit</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(0,245,255,0.15)', color: '#00f5ff' }}>
            Free
          </span>
        </div>
      </div>
    </div>
  )
}