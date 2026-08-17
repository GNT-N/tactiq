import { prisma } from '@/lib/prisma'
import { getUser, unauthorized } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { nom: true, metier: true, ville: true, plan: true, theme: true }
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Erreur profil:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json()

    const profile = await prisma.user.update({
      where: { id: user.id },
      data: {
        nom: body.nom !== undefined ? body.nom : undefined,
        metier: body.metier !== undefined ? body.metier : undefined,
        ville: body.ville !== undefined ? body.ville : undefined,
        theme: body.theme !== undefined ? body.theme : undefined,
      }
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Erreur maj profil:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
