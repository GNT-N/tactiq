import { prisma } from '@/lib/prisma'
import { getUser, unauthorized, userOwnsProspect } from '@/lib/auth'
import { NextResponse } from 'next/server'

const STATUTS_ACCEPTES = ['genere', 'envoye']

export async function GET(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const emails = await prisma.email.findMany({
      where: { prospect: { user_id: user.id } },
      include: {
        prospect: {
          select: { id: true, nom_entreprise: true, ville: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json(emails)
  } catch (error) {
    console.error('Erreur emails:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json()
    const { prospect_id, sujet, contenu } = body
    const statut = STATUTS_ACCEPTES.includes(body.statut) ? body.statut : 'genere'

    if (!prospect_id || !sujet?.trim() || !contenu?.trim()) {
      return NextResponse.json(
        { error: 'prospect_id, sujet et contenu requis' },
        { status: 400 }
      )
    }

    if (!(await userOwnsProspect(prospect_id, user.id))) {
      return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    }

    // Marquer envoyé fait avancer le pipeline : trace dans l'historique
    // et passage du prospect en "contacté" s'il était encore "nouveau".
    const email = await prisma.$transaction(async (tx) => {
      const created = await tx.email.create({
        data: {
          prospect_id,
          sujet,
          contenu,
          statut,
          envoye_at: statut === 'envoye' ? new Date() : null,
        }
      })

      if (statut === 'envoye') {
        const prospect = await tx.prospect.findUnique({
          where: { id: prospect_id },
          select: { statut: true }
        })
        const statutApres = prospect?.statut === 'nouveau' ? 'contacte' : prospect?.statut

        await tx.interaction.create({
          data: {
            prospect_id,
            type: 'email_envoye',
            contenu: sujet,
            statut_avant: prospect?.statut ?? null,
            statut_apres: statutApres ?? null,
          }
        })

        if (prospect?.statut === 'nouveau') {
          await tx.prospect.update({
            where: { id: prospect_id },
            data: { statut: 'contacte' }
          })
        }
      }

      return created
    })

    return NextResponse.json(email)
  } catch (error) {
    console.error('Erreur enregistrement email:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
