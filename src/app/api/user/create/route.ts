import { prisma } from '@/lib/prisma'
import { getUser, unauthorized } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Idempotent : crée le profil s'il manque, sinon renvoie l'existant.
// id et email viennent du token, jamais du body.
export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()
    if (!user.email) return NextResponse.json({ error: 'Email manquant' }, { status: 400 })

    const existingUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (existingUser) {
      return NextResponse.json(existingUser)
    }

    const nom = typeof user.user_metadata?.nom === 'string' ? user.user_metadata.nom : null

    const profile = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        nom,
        plan: 'free',
        theme: 'cyberpunk',
        dark_mode: true
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Erreur création user:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
