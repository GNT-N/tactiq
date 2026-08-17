import { prisma } from '@/lib/prisma'
import { getUser, unauthorized } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return unauthorized()

    const campagne = await prisma.campagne.findFirst({
      where: { id, user_id: user.id },
      include: {
        secteur: true,
        prospects: {
          orderBy: { score: 'desc' }
        }
      }
    })

    if (!campagne) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(campagne)
  } catch (error) {
    console.error('Erreur campagne:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json()

    // Whitelist : le body ne doit jamais pouvoir écrire user_id, id ou created_at.
    const campagne = await prisma.campagne.updateMany({
      where: { id, user_id: user.id },
      data: {
        nom: body.nom !== undefined ? body.nom : undefined,
        description: body.description !== undefined ? body.description : undefined,
        statut: body.statut !== undefined ? body.statut : undefined,
        secteur_id: body.secteur_id !== undefined ? body.secteur_id : undefined,
      }
    })

    if (campagne.count === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(campagne)
  } catch (error) {
    console.error('Erreur maj campagne:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return unauthorized()

    // Détache les prospects de la campagne avant suppression
    await prisma.prospect.updateMany({
      where: { campagne_id: id, user_id: user.id },
      data: { campagne_id: null }
    })

    await prisma.campagne.deleteMany({
      where: { id, user_id: user.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression campagne:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
