'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// La racine n'affiche rien : elle aiguille vers le CRM si une session existe,
// vers la connexion sinon. L'aiguillage est forcément côté client — la session
// vit dans le localStorage, le serveur ne peut pas la voir.
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      router.replace(data.session ? '/dashboard' : '/login')
    })
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-black tracking-[0.3em] text-cyan-400">TACTIQ</h1>
        <p className="text-white/30 text-sm">Chargement...</p>
      </div>
    </div>
  )
}
