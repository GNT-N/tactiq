import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { id, email, nom } = await request.json()

    if (!id || !email) {
      return NextResponse.json(
        { error: 'id et email requis' },
        { status: 400 }
      )
    }

    // Vérifie si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (existingUser) {
      return NextResponse.json(existingUser)
    }

    // Crée le profil utilisateur
    const user = await prisma.user.create({
      data: {
        id,
        email,
        nom: nom || null,
        plan: 'free',
        theme: 'cyberpunk',
        dark_mode: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erreur création user:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}