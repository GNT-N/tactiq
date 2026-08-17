import { prisma } from '@/lib/prisma'
import { getUser, unauthorized } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const campagnes = await prisma.campagne.findMany({
      where: { user_id: user.id },
      include: {
        secteur: true,
        _count: { select: { prospects: true } }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(campagnes)
  } catch (error) {
    console.error('Erreur campagnes:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json()

    const campagne = await prisma.campagne.create({
        data: {
            nom: body.nom,
            description: body.description || null,
            statut: 'active',
            user: {
            connect: { id: user.id }
            },
            ...(body.secteur_id ? {
            secteur: { connect: { id: body.secteur_id } }
            } : {})
        },
        include: {
            secteur: true,
            _count: { select: { prospects: true } }
        }
    })

    return NextResponse.json(campagne)
  } catch (error) {
    console.error('Erreur création campagne:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
