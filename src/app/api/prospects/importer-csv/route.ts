import { prisma } from '@/lib/prisma'
import { getUser, unauthorized, userOwnsCampagne } from '@/lib/auth'
import { lireProspects } from '@/lib/csv'
import { cleProspect } from '@/lib/dedupe'
import { NextResponse } from 'next/server'

export const maxDuration = 60

const LIMITE_MAX = 1000
const TAILLE_MAX_OCTETS = 2_000_000

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const contenu: string = body?.contenu ?? ''
    const campagne_id: string | undefined = body?.campagne_id

    if (!contenu.trim()) {
      return NextResponse.json({ error: 'Fichier vide' }, { status: 400 })
    }
    if (contenu.length > TAILLE_MAX_OCTETS) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (2 Mo maximum)' },
        { status: 413 }
      )
    }
    if (campagne_id && !(await userOwnsCampagne(campagne_id, user.id))) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }

    const { lignes, ignorees, colonnes_reconnues, separateur } = lireProspects(contenu)

    if (!colonnes_reconnues.includes('nom_entreprise')) {
      return NextResponse.json(
        {
          error: "Aucune colonne de nom d'entreprise reconnue. Attendu : nom, entreprise, raison sociale, enseigne ou société.",
          colonnes_reconnues,
        },
        { status: 400 }
      )
    }

    const existants = await prisma.prospect.findMany({
      where: { user_id: user.id },
      select: { nom_entreprise: true, ville: true },
    })
    const connus = new Set(existants.map(p => cleProspect(p.nom_entreprise, p.ville)))

    const nouveaux = []
    for (const l of lignes) {
      const k = cleProspect(l.nom_entreprise, l.ville)
      if (connus.has(k)) continue
      connus.add(k) // évite aussi les doublons internes au fichier
      nouveaux.push(l)
      if (nouveaux.length >= LIMITE_MAX) break
    }

    if (nouveaux.length > 0) {
      await prisma.prospect.createMany({
        data: nouveaux.map(l => ({
          user_id: user.id,
          campagne_id: campagne_id ?? null,
          nom_entreprise: l.nom_entreprise,
          ville: l.ville,
          adresse: l.adresse,
          telephone: l.telephone,
          email_contact: l.email_contact,
          site_web: l.site_web,
          nom_dirigeant: l.nom_dirigeant,
          siret: l.siret,
          secteur_activite: l.secteur_activite,
          notes: l.notes,
          score: 0,
          statut: 'nouveau',
        })),
      })
    }

    return NextResponse.json({
      lues: lignes.length,
      importes: nouveaux.length,
      doublons: lignes.length - nouveaux.length,
      ignorees,
      colonnes_reconnues,
      separateur,
    })
  } catch (error) {
    console.error('Erreur import CSV:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
