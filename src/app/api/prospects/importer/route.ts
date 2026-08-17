import { prisma } from '@/lib/prisma'
import { getUser, unauthorized, userOwnsCampagne } from '@/lib/auth'
import { chercherProspects, CATEGORIES } from '@/lib/overpass'
import { NextResponse } from 'next/server'

// L'appel à Overpass peut prendre plusieurs dizaines de secondes.
export const maxDuration = 60

const LIMITE_DEFAUT = 50
const LIMITE_MAX = 200

// Deux fiches OSM de la même enseigne s'écrivent rarement à l'identique :
// on compare sur une forme normalisée plutôt que caractère par caractère.
const DIACRITIQUES = /[\u0300-\u036f]/g

function normaliser(v: string) {
  return v.normalize('NFD').replace(DIACRITIQUES, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function cle(nom: string, ville: string | null) {
  return `${normaliser(nom)}@${normaliser(ville ?? '')}`
}

export async function POST(request: Request) {
  try {
    const user = await getUser(request)
    if (!user) return unauthorized()

    const body = await request.json().catch(() => ({}))
    const ville: string = (body?.ville ?? '').trim()
    const categorie: string = body?.categorie
    const campagne_id: string | undefined = body?.campagne_id
    const limite = Math.min(Math.max(Number(body?.limite) || LIMITE_DEFAUT, 1), LIMITE_MAX)

    if (!ville) {
      return NextResponse.json({ error: 'Commune requise' }, { status: 400 })
    }
    if (!CATEGORIES[categorie]) {
      return NextResponse.json(
        { error: 'Catégorie inconnue', categories: Object.keys(CATEGORIES) },
        { status: 400 }
      )
    }
    if (campagne_id && !(await userOwnsCampagne(campagne_id, user.id))) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }

    const trouves = await chercherProspects(ville, categorie, true)

    // Dédoublonnage contre l'existant : réimporter la même commune deux fois
    // ne doit pas créer de doublons.
    const existants = await prisma.prospect.findMany({
      where: { user_id: user.id },
      select: { nom_entreprise: true, ville: true },
    })
    const connus = new Set(existants.map(p => cle(p.nom_entreprise, p.ville)))

    const nouveaux = []
    for (const p of trouves) {
      const k = cle(p.nom_entreprise, p.ville)
      if (connus.has(k)) continue
      connus.add(k) // évite aussi les doublons internes au lot
      nouveaux.push(p)
      if (nouveaux.length >= limite) break
    }

    if (nouveaux.length > 0) {
      await prisma.prospect.createMany({
        data: nouveaux.map(p => ({
          user_id: user.id,
          campagne_id: campagne_id ?? null,
          nom_entreprise: p.nom_entreprise,
          secteur_activite: categorie,
          ville: p.ville,
          adresse: p.adresse,
          telephone: p.telephone,
          site_web: p.site_web,
          score: 0,
          statut: 'nouveau',
        })),
      })
    }

    return NextResponse.json({
      trouves: trouves.length,
      importes: nouveaux.length,
      doublons: trouves.length - nouveaux.length,
      limite_atteinte: nouveaux.length >= limite,
    })
  } catch (error) {
    console.error('Erreur import prospects:', error)
    const message = error instanceof Error && error.message.includes('saturé')
      ? error.message
      : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
