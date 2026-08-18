import { prisma } from '@/lib/prisma'
import { getUser, unauthorized, userOwnsCampagne } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return unauthorized()

    const prospect = await prisma.prospect.findFirst({
      where: { id, user_id: user.id },
      include: {
        campagne: true,
        interactions: { orderBy: { created_at: 'desc' } },
        emails: { orderBy: { created_at: 'desc' } }
      }
    })

    if (!prospect) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(prospect)
  } catch (error) {
    console.error('Erreur prospect:', error)
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

    if (body.campagne_id && !(await userOwnsCampagne(body.campagne_id, user.id))) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 400 })
    }

    // Whitelist : le body ne doit jamais pouvoir écrire user_id, id ou created_at.
    const prospect = await prisma.prospect.updateMany({
      where: { id, user_id: user.id },
      data: {
        // Champs d'identité et de contact : modifiables un par un depuis la
        // fiche, sans passer par le formulaire complet.
        nom_entreprise: body.nom_entreprise !== undefined ? body.nom_entreprise : undefined,
        nom_dirigeant: body.nom_dirigeant !== undefined ? body.nom_dirigeant : undefined,
        telephone: body.telephone !== undefined ? body.telephone : undefined,
        email_contact: body.email_contact !== undefined ? body.email_contact : undefined,
        site_web: body.site_web !== undefined ? body.site_web : undefined,
        adresse: body.adresse !== undefined ? body.adresse : undefined,
        ville: body.ville !== undefined ? body.ville : undefined,
        siret: body.siret !== undefined ? body.siret : undefined,
        secteur_activite: body.secteur_activite !== undefined ? body.secteur_activite : undefined,
        statut: body.statut !== undefined ? body.statut : undefined,
        score: body.score !== undefined ? body.score : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        valeur_estimee: body.valeur_estimee !== undefined ? body.valeur_estimee : undefined,
        prochaine_action: body.prochaine_action !== undefined ? body.prochaine_action : undefined,
        prochaine_action_date: body.prochaine_action_date !== undefined ? body.prochaine_action_date : undefined,
        campagne_id: body.campagne_id !== undefined ? body.campagne_id : undefined,
      }
    })

    if (prospect.count === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(prospect)
  } catch (error) {
    console.error('Erreur maj prospect:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json()

    if (body.campagne_id && !(await userOwnsCampagne(body.campagne_id, user.id))) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 400 })
    }

    const prospect = await prisma.prospect.updateMany({
      where: { id, user_id: user.id },
      data: {
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
        score: body.score,
      }
    })

    if (prospect.count === 0) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(prospect)
  } catch (error) {
    console.error('Erreur maj prospect:', error)
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

    await prisma.prospect.deleteMany({
      where: { id, user_id: user.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression prospect:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
