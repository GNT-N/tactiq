import { prisma } from '@/lib/prisma'
import { getUser, unauthorized } from '@/lib/auth'
import { envoyerEmail, smtpConfigure } from '@/lib/mailer'
import { NextResponse } from 'next/server'

// Un envoi SMTP peut prendre plusieurs secondes.
export const maxDuration = 60

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

    // envoyer=true déclenche un envoi réel ; sinon on ne fait qu'enregistrer.
    const envoyer = body.envoyer === true
    const statut = envoyer
      ? 'envoye'
      : (STATUTS_ACCEPTES.includes(body.statut) ? body.statut : 'genere')

    if (!prospect_id || !sujet?.trim() || !contenu?.trim()) {
      return NextResponse.json(
        { error: 'prospect_id, sujet et contenu requis' },
        { status: 400 }
      )
    }

    const prospect = await prisma.prospect.findFirst({
      where: { id: prospect_id, user_id: user.id },
      select: { id: true, statut: true, email_contact: true }
    })

    if (!prospect) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

    // L'envoi passe avant l'enregistrement : on ne veut jamais marquer
    // "envoyé" un message que le serveur SMTP a refusé.
    let destinataire: string | null = null

    if (envoyer) {
      if (!smtpConfigure()) {
        return NextResponse.json(
          { error: "L'envoi n'est pas configuré. Renseigne SMTP_HOST, SMTP_USER et SMTP_PASSWORD." },
          { status: 400 }
        )
      }
      if (!prospect.email_contact) {
        return NextResponse.json(
          { error: "Ce prospect n'a pas d'adresse email. Renseigne-la sur sa fiche." },
          { status: 400 }
        )
      }

      try {
        const resultat = await envoyerEmail(prospect.email_contact, sujet, contenu)
        destinataire = resultat.destinataire
      } catch (error) {
        console.error('Envoi SMTP échoué:', error)
        return NextResponse.json(
          { error: `Envoi refusé par le serveur mail : ${error instanceof Error ? error.message : 'erreur inconnue'}` },
          { status: 502 }
        )
      }
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
        const statutApres = prospect.statut === 'nouveau' ? 'contacte' : prospect.statut

        await tx.interaction.create({
          data: {
            prospect_id,
            type: 'email_envoye',
            contenu: destinataire ? `${sujet} → ${destinataire}` : sujet,
            statut_avant: prospect.statut,
            statut_apres: statutApres,
          }
        })

        if (prospect.statut === 'nouveau') {
          await tx.prospect.update({
            where: { id: prospect_id },
            data: { statut: 'contacte' }
          })
        }
      }

      return created
    })

    return NextResponse.json({ ...email, destinataire })
  } catch (error) {
    console.error('Erreur enregistrement email:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
