import { prisma } from '@/lib/prisma'
import { getUser, unauthorized, userOwnsProspect } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json()

    if (!body.prospect_id) {
      return NextResponse.json({ error: 'prospect_id requis' }, { status: 400 })
    }

    if (!(await userOwnsProspect(body.prospect_id, user.id))) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }

    const interaction = await prisma.interaction.create({
      data: {
        prospect_id: body.prospect_id,
        type: body.type,
        contenu: body.contenu || null,
        statut_avant: body.statut_avant || null,
        statut_apres: body.statut_apres || null,
      }
    })

    return NextResponse.json(interaction)
  } catch (error) {
    console.error('Erreur création interaction:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
