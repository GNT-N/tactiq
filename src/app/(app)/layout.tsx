'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ThemeProvider, useTheme } from '@/components/ThemeProvider'
import { themes, variablesCss, type ThemeKey } from '@/lib/themes'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '⬡' },
  { href: '/prospects', label: 'Prospects', icon: '◎' },
  { href: '/campagnes', label: 'Campagnes', icon: '◈' },
  { href: '/emails', label: 'Emails', icon: '◇' },
  { href: '/parametres', label: 'Paramètres', icon: '◉' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DashboardChrome>{children}</DashboardChrome>
    </ThemeProvider>
  )
}

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, t, setTheme } = useTheme()
  const [userEmail, setUserEmail] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sans session, on ne laisse même pas s'afficher la coquille du dashboard.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
        return
      }
      setUserEmail(data.session.user.email || '')
    })
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex relative" style={{ ...variablesCss(theme), backgroundColor: t.bg }}>

      {/* Grille d'arpentage : repère statique, pas de boucle d'animation.
          Les lignes fortes tous les 5 pas donnent l'échelle. */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: [
          'linear-gradient(var(--theme-primary-04) 1px, transparent 1px)',
          'linear-gradient(90deg, var(--theme-primary-04) 1px, transparent 1px)',
          'linear-gradient(var(--theme-primary-10) 1px, transparent 1px)',
          'linear-gradient(90deg, var(--theme-primary-10) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: '32px 32px, 32px 32px, 160px 160px, 160px 160px',
      }} />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: `${t.card}ee`, borderRight: '1px solid var(--theme-primary-20)', backdropFilter: 'blur(20px)' }}>

        {/* Logo */}
        <div className="p-6 mb-2">
          <h1 className="text-2xl font-black tracking-[0.3em]"
            style={{ color: t.primary, textShadow: `0 0 20px ${t.primary}, 0 0 40px ${t.primary}66` }}>
            TACTIQ
          </h1>
          <p className="text-xs mt-1 opacity-40 text-white tracking-widest">PROSPECTION IA</p>
        </div>

        {/* Thèmes */}
        <div className="px-6 mb-6">
          <p className="text-xs opacity-40 text-white mb-2 tracking-widest">THÈME</p>
          <div className="flex gap-2">
            {(Object.keys(themes) as ThemeKey[]).map(key => (
              <button key={key} onClick={() => setTheme(key)}
                className="w-6 h-6 rounded-full border-2 transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: themes[key].primary,
                  borderColor: theme === key ? 'white' : 'transparent',
                  transform: theme === key ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: theme === key ? `0 0 8px ${themes[key].primary}` : 'none'
                }}
                title={themes[key].nom} />
            ))}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg mb-1 text-sm font-medium transition-all duration-200"
                style={active ? {
                  backgroundColor: `${t.primary}20`,
                  color: t.primary,
                  boxShadow: `inset 3px 0 0 ${t.primary}, 0 0 20px ${t.primary}10`,
                } : { color: 'rgba(255,255,255,0.4)' }}>
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 m-3 rounded-lg"
          style={{ backgroundColor: `${t.primary}10`, border: '1px solid var(--theme-primary-20)' }}>
          <p className="text-xs text-white opacity-40 mb-1">Connecté</p>
          <p className="text-xs text-white truncate mb-3">{userEmail}</p>
          <button onClick={handleLogout}
            className="text-xs w-full py-1.5 rounded opacity-60 hover:opacity-100 transition text-white"
            style={{ border: '1px solid var(--theme-primary-20)' }}>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-h-screen relative z-10">
        {/* Topbar mobile */}
        <div className="lg:hidden flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--theme-primary-20)', backdropFilter: 'blur(10px)' }}>
          <h1 className="text-xl font-black tracking-widest" style={{ color: t.primary }}>TACTIQ</h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-white opacity-60 text-2xl">☰</button>
        </div>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
