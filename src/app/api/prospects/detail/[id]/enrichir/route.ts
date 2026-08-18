import { getUser, unauthorized } from '@/lib/auth'
import { enrichirProspect } from '@/lib/enrichir-prospect'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return unauthorized()

    const resultat = await enrichirProspect(id, user.id)
    if (!resultat) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    return NextResponse.json(resultat)
  } catch (error) {
    console.error('Erreur enrichissement:', error)
    const message = error instanceof Error && error.message.includes('saturé')
      ? error.message
      : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
