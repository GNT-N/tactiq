'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

const themes = {
  cyberpunk: { primary: '#00f5ff', secondary: '#bf00ff', bg: '#030712', card: '#0a0f1e', border: '#00f5ff33' },
  aurora:    { primary: '#f472b6', secondary: '#a855f7', bg: '#0d0718', card: '#130a1f', border: '#f472b633' },
  fire:      { primary: '#f97316', secondary: '#ef4444', bg: '#0f0805', card: '#1a0e08', border: '#f9731633' },
  matrix:    { primary: '#22c55e', secondary: '#06b6d4', bg: '#030f05', card: '#071a0a', border: '#22c55e33' },
  gold:      { primary: '#f5c842', secondary: '#b8860b', bg: '#080600', card: '#110e00', border: '#f5c84233' },
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⬡' },
  { href: '/dashboard/prospects', label: 'Prospects', icon: '◎' },
  { href: '/dashboard/campagnes', label: 'Campagnes', icon: '◈' },
  { href: '/dashboard/emails', label: 'Emails', icon: '◇' },
  { href: '/dashboard/parametres', label: 'Paramètres', icon: '◉' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [theme, setTheme] = useState<keyof typeof themes>('cyberpunk')
  const [userEmail, setUserEmail] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const t = themes[theme]

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserEmail(data.user.email || '')
    })
  }, [])

  // Background canvas animé
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    // Particules
    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.1,
      })
    }

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Lignes de grille subtiles
      ctx.strokeStyle = `${t.primary}08`
      ctx.lineWidth = 1
      const gridSize = 80
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Particules + connexions
      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        // Point
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `${t.primary}${Math.floor(p.opacity * 255).toString(16).padStart(2, '0')}`
        ctx.fill()

        // Connexions entre particules proches
        particles.slice(i + 1).forEach(p2 => {
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `${t.primary}${Math.floor((1 - dist / 120) * 0.15 * 255).toString(16).padStart(2, '0')}`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        })
      })

      animId = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [theme, t.primary])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex relative" style={{ backgroundColor: t.bg }}>

      {/* Background animé */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: `${t.card}ee`, borderRight: `1px solid ${t.border}`, backdropFilter: 'blur(20px)' }}>

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
            {(Object.keys(themes) as Array<keyof typeof themes>).map(key => (
              <button key={key} onClick={() => setTheme(key)}
                className="w-6 h-6 rounded-full border-2 transition-all duration-200 hover:scale-110"
                style={{
                  backgroundColor: themes[key].primary,
                  borderColor: theme === key ? 'white' : 'transparent',
                  transform: theme === key ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: theme === key ? `0 0 8px ${themes[key].primary}` : 'none'
                }}
                title={key} />
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
          style={{ backgroundColor: `${t.primary}10`, border: `1px solid ${t.border}` }}>
          <p className="text-xs text-white opacity-40 mb-1">Connecté</p>
          <p className="text-xs text-white truncate mb-3">{userEmail}</p>
          <button onClick={handleLogout}
            className="text-xs w-full py-1.5 rounded opacity-60 hover:opacity-100 transition text-white"
            style={{ border: `1px solid ${t.border}` }}>
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
          style={{ borderBottom: `1px solid ${t.border}`, backdropFilter: 'blur(10px)' }}>
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