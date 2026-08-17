'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { estThemeValide, themes, THEME_PAR_DEFAUT, type ThemeKey } from '@/lib/themes'

interface ThemeContextValue {
  theme: ThemeKey
  t: (typeof themes)[ThemeKey]
  setTheme: (theme: ThemeKey) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans un ThemeProvider')
  return ctx
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(THEME_PAR_DEFAUT)

  // Le thème du profil est la source de vérité.
  useEffect(() => {
    apiFetch('/api/user/me')
      .then(res => res.ok ? res.json() : null)
      .then(profile => {
        if (estThemeValide(profile?.theme)) setThemeState(profile.theme)
      })
      .catch(() => {})
  }, [])

  // Appliqué tout de suite en local, persisté en arrière-plan.
  const setTheme = (nouveau: ThemeKey) => {
    setThemeState(nouveau)
    apiFetch('/api/user/me', {
      method: 'PATCH',
      body: JSON.stringify({ theme: nouveau })
    }).catch(() => {})
  }

  return (
    <ThemeContext.Provider value={{ theme, t: themes[theme], setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
