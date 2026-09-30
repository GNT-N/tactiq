'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    if (data.session) {
      // Crée le profil s'il manque encore (compte confirmé par email après coup)
      await fetch('/api/user/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` }
      })
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400 tracking-widest">TACTIQ</h1>
          <p className="text-gray-400 mt-2">Connectez-vous à votre espace</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-cyan-900 rounded-2xl p-8 shadow-lg shadow-cyan-950">
          <div className="space-y-5">
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

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-gray-950 font-bold py-3 rounded-lg transition"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

          </div>
        </div>
      </div>
    </div>
  )
}