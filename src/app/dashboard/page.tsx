'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const activityData = [
  { jour: '01/05', prospects: 3, emails: 2 },
  { jour: '05/05', prospects: 7, emails: 5 },
  { jour: '10/05', prospects: 4, emails: 8 },
  { jour: '15/05', prospects: 12, emails: 9 },
  { jour: '20/05', prospects: 8, emails: 6 },
  { jour: '25/05', prospects: 15, emails: 11 },
  { jour: '30/05', prospects: 10, emails: 14 },
]

const statutsData = [
  { name: 'Nouveau', value: 42, color: '#64748b' },
  { name: 'Contacté', value: 28, color: '#3b82f6' },
  { name: 'En attente', value: 18, color: '#f59e0b' },
  { name: 'Converti', value: 8, color: '#22c55e' },
  { name: 'Perdu', value: 4, color: '#ef4444' },
]

const campagnes = [
  { nom: 'Restaurants Lyon', prospects: 34, contacts: 18, statut: 'active' },
  { nom: 'Artisans Grenoble', prospects: 21, contacts: 7, statut: 'active' },
  { nom: 'Coiffeurs St-Étienne', prospects: 15, contacts: 3, statut: 'pause' },
]

const actions = [
  { label: 'Relancer Menuiserie Fabre', priorite: 'haute', date: 'Aujourd\'hui' },
  { label: 'Envoyer devis Resto Le Bouchon', priorite: 'haute', date: 'Aujourd\'hui' },
  { label: 'Appeler Plomberie Martin', priorite: 'moyenne', date: 'Demain' },
  { label: 'Analyser nouveaux prospects', priorite: 'basse', date: 'Cette semaine' },
]

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let start = 0
    const step = value / 40
    const timer = setInterval(() => {
      start += step
      if (start >= value) { setDisplay(value); clearInterval(timer) }
      else setDisplay(Math.floor(start))
    }, 30)
    return () => clearInterval(timer)
  }, [value])
  return <span>{prefix}{display.toLocaleString()}{suffix}</span>
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [primaryColor, setPrimaryColor] = useState('#00f5ff')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
    })

    // Récupère la couleur primaire du thème depuis le layout
    const updateColor = () => {
      const style = getComputedStyle(document.documentElement)
      // Lit la couleur depuis le parent
      const el = document.querySelector('[style*="--primary"]') as HTMLElement
      if (el) setPrimaryColor(el.style.getPropertyValue('--primary').trim() || '#00f5ff')
    }
    updateColor()
    const observer = new MutationObserver(updateColor)
    observer.observe(document.body, { attributes: true, subtree: true, childList: true })
    return () => observer.disconnect()
  }, [router])

  if (!user) return null

  const kpis = [
    { label: 'Prospects total', value: 247, suffix: '', icon: '◎', delta: '+12 ce mois' },
    { label: 'Emails envoyés', value: 189, suffix: '', icon: '◇', delta: '+24 ce mois' },
    { label: 'Taux conversion', value: 8, suffix: '%', icon: '⬡', delta: '+2% vs mois dernier' },
    { label: 'Pipeline', value: 42500, prefix: '', suffix: '€', icon: '◈', delta: '+8 200€ ce mois' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">
          Bonjour, <span style={{ color: primaryColor }}>{user.email?.split('@')[0]}</span> 👋
        </h2>
        <p className="text-white/40 text-sm mt-1">Voici un résumé de votre activité</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="rounded-xl p-5 relative overflow-hidden group"
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`,
              border: `1px solid ${primaryColor}22`,
              backdropFilter: 'blur(10px)'
            }}>
            {/* Glow corner */}
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20"
              style={{ background: primaryColor, transform: 'translate(30%, -30%)' }} />

            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl" style={{ color: primaryColor }}>{kpi.icon}</span>
            </div>
            <div className="text-3xl font-black text-white mb-1">
              {kpi.prefix}<AnimatedNumber value={kpi.value} />{kpi.suffix}
            </div>
            <div className="text-xs text-white/40 mb-2">{kpi.label}</div>
            <div className="text-xs font-medium" style={{ color: primaryColor }}>↑ {kpi.delta}</div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Activité */}
        <div className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${primaryColor}22`, backdropFilter: 'blur(10px)' }}>
          <h3 className="text-sm font-semibold text-white/60 tracking-widest mb-4">ACTIVITÉ 30 JOURS</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="gradProspects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradEmails" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="jour" stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 11 }} />
              <YAxis stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0f1e', border: `1px solid ${primaryColor}44`, borderRadius: '8px', color: 'white' }}
              />
              <Area type="monotone" dataKey="prospects" stroke={primaryColor} strokeWidth={2} fill="url(#gradProspects)" name="Prospects" />
              <Area type="monotone" dataKey="emails" stroke="#a855f7" strokeWidth={2} fill="url(#gradEmails)" name="Emails" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Camembert */}
        <div className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${primaryColor}22`, backdropFilter: 'blur(10px)' }}>
          <h3 className="text-sm font-semibold text-white/60 tracking-widest mb-4">STATUTS</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={statutsData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                {statutsData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0a0f1e', border: `1px solid ${primaryColor}44`, borderRadius: '8px', color: 'white' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {statutsData.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-white/50">{s.name}</span>
                </div>
                <span className="text-white/70 font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campagnes + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Campagnes */}
        <div className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${primaryColor}22`, backdropFilter: 'blur(10px)' }}>
          <h3 className="text-sm font-semibold text-white/60 tracking-widest mb-4">CAMPAGNES ACTIVES</h3>
          <div className="space-y-4">
            {campagnes.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white font-medium">{c.nom}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: c.statut === 'active' ? `${primaryColor}20` : '#ffffff10', color: c.statut === 'active' ? primaryColor : '#ffffff40' }}>
                    {c.statut}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${(c.contacts / c.prospects) * 100}%`, backgroundColor: primaryColor, boxShadow: `0 0 8px ${primaryColor}` }} />
                  </div>
                  <span className="text-xs text-white/40">{c.contacts}/{c.prospects}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${primaryColor}22`, backdropFilter: 'blur(10px)' }}>
          <h3 className="text-sm font-semibold text-white/60 tracking-widest mb-4">ACTIONS À FAIRE</h3>
          <div className="space-y-3">
            {actions.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: a.priorite === 'haute' ? '#ef4444' : a.priorite === 'moyenne' ? '#f59e0b' : '#64748b', boxShadow: `0 0 6px ${a.priorite === 'haute' ? '#ef4444' : a.priorite === 'moyenne' ? '#f59e0b' : '#64748b'}` }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.label}</p>
                  <p className="text-xs text-white/30">{a.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}