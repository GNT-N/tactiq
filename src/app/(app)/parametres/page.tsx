'use client'

import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { useTheme } from '@/components/ThemeProvider'
import { themes, type ThemeKey } from '@/lib/themes'

export default function ParametresPage() {
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [email, setEmail] = useState('')
  const [form, setForm] = useState({
    nom: '',
    metier: '',
    ville: '',
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

  const inputClass = "w-full bg-[var(--acier-700)] border border-[var(--acier-600)] rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-[var(--theme-primary-50)] transition"
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
          style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))' }}>
          {loading ? 'Enregistrement...' : saved ? '✓ Enregistré' : 'Enregistrer'}
        </button>
      </div>

      {/* Profil */}
      <div className="rounded-xl p-6 space-y-4"
        style={{ background: 'var(--acier-800)', border: '1px solid var(--acier-600)' }}>
        <h3 className="text-xs font-semibold tracking-widest text-white/40">PROFIL</h3>

        {/* Avatar */}
        <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '1px solid var(--acier-600)' }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-secondary))', color: 'black' }}>
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
        style={{ background: 'var(--acier-800)', border: '1px solid var(--acier-600)' }}>
        <h3 className="text-xs font-semibold tracking-widest text-white/40">THÈME</h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.keys(themes) as ThemeKey[]).map(key => {
            const palette = themes[key]
            const actif = theme === key
            return (
              <button key={key}
                onClick={() => setTheme(key)}
                className="p-4 rounded-lg transition-all"
                style={{
                  background: actif ? `${palette.primary}15` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${actif ? palette.primary + '60' : 'rgba(255,255,255,0.08)'}`,
                }}>
                <div className="flex gap-1.5 mb-2 justify-center">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.primary }} />
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: palette.secondary }} />
                </div>
                <p className="text-xs text-center" style={{ color: actif ? palette.primary : 'rgba(255,255,255,0.5)' }}>
                  {palette.nom}
                </p>
              </button>
            )
          })}
        </div>
        <p className="text-white/30 text-xs">Appliqué immédiatement à toute l&apos;interface et enregistré sur ton profil.</p>
      </div>

      {/* Compte */}
      <div className="rounded-xl p-6 space-y-4"
        style={{ background: 'var(--acier-800)', border: '1px solid var(--acier-600)' }}>
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
            style={{ backgroundColor: 'var(--theme-primary-15)', color: 'var(--theme-primary)' }}>
            Free
          </span>
        </div>
      </div>
    </div>
  )
}