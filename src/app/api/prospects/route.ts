import { prisma } from '@/lib/prisma'
import { getUser, unauthorized, userOwnsCampagne } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const prospects = await prisma.prospect.findMany({
      where: { user_id: user.id },
      include: { campagne: true },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(prospects)
  } catch (error) {
    console.error('Erreur prospects:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json()

    if (body.campagne_id && !(await userOwnsCampagne(body.campagne_id, user.id))) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 400 })
    }

    const prospect = await prisma.prospect.create({
      data: {
        user_id: user.id,
        nom_entreprise: body.nom_entreprise,
        secteur_activite: body.secteur_activite || null,
        ville: body.ville || null,
        adresse: body.adresse || null,
        telephone: body.telephone || null,
        email_contact: body.email_contact || null,
        site_web: body.site_web || null,
        nom_dirigeant: body.nom_dirigeant || null,
        siret: body.siret || null,
        valeur_estimee: body.valeur_estimee || null,
        notes: body.notes || null,
        campagne_id: body.campagne_id || null,
        score: 0,
        statut: 'nouveau',
      }
    })

    return NextResponse.json(prospect)
  } catch (error) {
    console.error('Erreur création prospect:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
