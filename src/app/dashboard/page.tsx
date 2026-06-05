'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const statutsColors: Record<string, string> = {
  nouveau:    '#64748b',
  contacte:   '#3b82f6',
  en_attente: '#f59e0b',
  converti:   '#22c55e',
  perdu:      '#ef4444',
}

const statutsLabels: Record<string, string> = {
  nouveau:    'Nouveau',
  contacte:   'Contacté',
  en_attente: 'En attente',
  converti:   'Converti',
  perdu:      'Perdu',
}

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
  const [stats, setStats] = useState({
    totalProspects: 0,
    emailsEnvoyes: 0,
    tauxConversion: 0,
    pipeline: 0,
  })
  const [statutsData, setStatutsData] = useState<any[]>([])
  const [activityData, setActivityData] = useState<any[]>([])
  const [campagnes, setCampagnes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)

      apiFetch('/api/user/me')
        .then(res => res.json())
        .then(profile => {
          if (profile?.nom) setUser((prev: any) => ({ ...prev, nom: profile.nom }))
        })
    })
  }, [router])

  useEffect(() => {
    if (!user) return

    apiFetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data.stats)
        setStatutsData(data.statuts)
        setActivityData(data.activity)
        setCampagnes(data.campagnes)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user])

  if (!user) return null

  const kpis = [
    { label: 'Prospects total', value: stats.totalProspects, suffix: '', icon: '◎', delta: 'total' },
    { label: 'Emails envoyés', value: stats.emailsEnvoyes, suffix: '', icon: '◇', delta: 'total' },
    { label: 'Taux conversion', value: stats.tauxConversion, suffix: '%', icon: '⬡', delta: 'convertis' },
    { label: 'Pipeline', value: stats.pipeline, prefix: '', suffix: '€', icon: '◈', delta: 'estimé' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white tracking-wide">
          Bonjour, <span style={{ color: '#00f5ff' }}>{user.nom || user.email?.split('@')[0]}</span> 👋
        </h2>
        <p className="text-white/40 text-sm mt-1">Voici un résumé de votre activité</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="rounded-xl p-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
              border: '1px solid rgba(0,245,255,0.15)',
              backdropFilter: 'blur(10px)'
            }}>
            <div className="absolute top-0 right-0 w-16 h-16 rounded-full blur-2xl opacity-20"
              style={{ background: '#00f5ff', transform: 'translate(30%, -30%)' }} />
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl" style={{ color: '#00f5ff' }}>{kpi.icon}</span>
            </div>
            <div className="text-3xl font-black text-white mb-1">
              {loading ? '—' : <><AnimatedNumber value={kpi.value} />{kpi.suffix}</>}
            </div>
            <div className="text-xs text-white/40 mb-2">{kpi.label}</div>
            <div className="text-xs font-medium text-cyan-400">↑ {kpi.delta}</div>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Activité */}
        <div className="lg:col-span-2 rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,245,255,0.1)', backdropFilter: 'blur(10px)' }}>
          <h3 className="text-sm font-semibold text-white/60 tracking-widest mb-4">ACTIVITÉ 30 JOURS</h3>
          {activityData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-white/20 text-sm">
              Pas encore de données
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="gradProspects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="jour" stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 11 }} />
                <YAxis stroke="#ffffff20" tick={{ fill: '#ffffff40', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0f1e', border: '1px solid rgba(0,245,255,0.3)', borderRadius: '8px', color: 'white' }} />
                <Area type="monotone" dataKey="prospects" stroke="#00f5ff" strokeWidth={2} fill="url(#gradProspects)" name="Prospects" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Camembert statuts */}
        <div className="rounded-xl p-5"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,245,255,0.1)', backdropFilter: 'blur(10px)' }}>
          <h3 className="text-sm font-semibold text-white/60 tracking-widest mb-4">STATUTS</h3>
          {statutsData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-white/20 text-sm">
              Aucun prospect
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={statutsData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {statutsData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a0f1e', border: '1px solid rgba(0,245,255,0.3)', borderRadius: '8px', color: 'white' }} />
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
            </>
          )}
        </div>
      </div>

      {/* Campagnes */}
      <div className="rounded-xl p-5"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(0,245,255,0.1)', backdropFilter: 'blur(10px)' }}>
        <h3 className="text-sm font-semibold text-white/60 tracking-widest mb-4">CAMPAGNES ACTIVES</h3>
        {campagnes.length === 0 ? (
          <div className="text-center py-6 text-white/20 text-sm">
            Aucune campagne active
          </div>
        ) : (
          <div className="space-y-4">
            {campagnes.map((c, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-white font-medium">{c.nom}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'rgba(0,245,255,0.15)', color: '#00f5ff' }}>
                    {c._count?.prospects || 0} prospects
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full"
                    style={{ width: '100%', backgroundColor: '#00f5ff', boxShadow: '0 0 8px #00f5ff' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}