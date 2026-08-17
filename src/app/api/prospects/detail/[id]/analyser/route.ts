import { getUser, unauthorized } from '@/lib/auth'
import { analyserProspect } from '@/lib/analyse-prospect'
import { NextResponse } from 'next/server'

// L'analyse fait un appel réseau vers le site du prospect puis un appel Groq.
export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return unauthorized()

    const resultat = await analyserProspect(id, user.id)
    if (!resultat) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    return NextResponse.json(resultat)
  } catch (error) {
    console.error('Erreur analyse prospect:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
