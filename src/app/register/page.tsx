'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    setInfo('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nom }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Le profil est créé côté serveur à partir du token, pas du body
      await fetch('/api/user/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      })
      router.push('/')
      return
    }

    // Pas de session : confirmation par email activée côté Supabase.
    // Le profil sera créé à la première connexion.
    setInfo('Compte créé. Confirme ton adresse par email pour te connecter.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 tracking-widest">TACTIQ</h1>
          <p className="text-gray-400 mt-2">Créez votre compte</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-cyan-900 rounded-2xl p-8 shadow-lg shadow-cyan-950">
          <div className="space-y-5">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Nom</label>
              <input
                type="text"
                value={nom}
                onChange={e => setNom(e.target.value)}
                placeholder="Nicolas"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nicolas@exemple.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            {info && (
              <p className="text-cyan-400 text-sm bg-cyan-950 border border-cyan-800 rounded-lg px-4 py-2">
                {info}
              </p>
            )}

            <button
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold py-3 rounded-lg transition"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>

            <p className="text-center text-gray-500 text-sm">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}